import crypto from 'crypto';
import { PoolClient } from '../lib/db';
import {
  haversineDistanceMeters,
  validateCoordinates,
  validateMandsaurServiceArea,
  MANDSAUR_CONFIG,
} from '../lib/geo';
import { calculatePriority } from '../domain/priority';
import { validateTransition } from '../domain/stateMachine';
import { generateFallbackSummary } from '../domain/templates';
import { aiSummarize } from '../integrations/aiClient';
import { findSimilarIssues } from './similarityService';
import { ValidatedFile, saveFileToDisk, deleteFileFromDisk } from '../lib/uploads';
import { validationError, conflict } from '../lib/errors';
import { getCitizenIssueView, CitizenIssueView } from './issueService';

export interface SubmitComplaintInput {
  organizationId: string;
  citizenId: string;
  categoryId: string;
  wardId: string;
  description: string;
  lat: number;
  lng: number;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  locationMethod?: 'GPS' | 'MANUAL';
  locationConfirmed?: boolean;
  joinIssueId?: string | null;
  aiSuggestionAccepted?: boolean;
  files: ValidatedFile[];
  isDemo?: boolean;
}

export async function submitComplaint(
  client: PoolClient,
  input: SubmitComplaintInput
): Promise<CitizenIssueView> {
  const savedFiles: { storagePath: string; absolutePath: string }[] = [];

  try {
    // 1. Strict coordinate & service boundary validation
    const coordCheck = validateCoordinates(input.lat, input.lng);
    if (!coordCheck.valid) {
      throw validationError(coordCheck.error || 'Invalid coordinates provided.');
    }
    const serviceAreaCheck = validateMandsaurServiceArea(coordCheck.lat, coordCheck.lng);
    if (!serviceAreaCheck.isWithinServiceArea) {
      throw validationError(
        serviceAreaCheck.message ||
          'Your selected location is outside the currently supported CivicPulse service area. Please select a location within Mandsaur.'
      );
    }

    const lat = coordCheck.lat;
    const lng = coordCheck.lng;
    const address = input.address?.trim() || null;
    const city = input.city?.trim() || MANDSAUR_CONFIG.cityName;
    const district = input.district?.trim() || MANDSAUR_CONFIG.district;
    const state = input.state?.trim() || MANDSAUR_CONFIG.state;
    const country = input.country?.trim() || MANDSAUR_CONFIG.country;
    const postalCode = input.postalCode?.trim() || null;
    const locationMethod = input.locationMethod || 'MANUAL';
    const locationConfirmed = input.locationConfirmed ?? true;

    // Save files to disk
    for (const f of input.files) {
      const saved = await saveFileToDisk(f);
      savedFiles.push(saved);
    }

    // Verify ward & category exist
    const { rows: wardRows } = await client.query<{
      id: string;
      name: string;
      center_lat: number;
      center_lng: number;
      radius_m: number | null;
    }>(
      'SELECT id, name, center_lat, center_lng, radius_m FROM wards WHERE id = $1 AND organization_id = $2',
      [input.wardId, input.organizationId]
    );
    if (wardRows.length === 0) {
      throw validationError('Selected ward not found.');
    }
    const ward = wardRows[0];

    const { rows: catRows } = await client.query<{
      id: string;
      name: string;
      key: string;
      category_score: number;
    }>(
      'SELECT id, name, `key`, category_score FROM categories WHERE id = $1 AND organization_id = $2',
      [input.categoryId, input.organizationId]
    );
    if (catRows.length === 0) {
      throw validationError('Selected category not found.');
    }
    const category = catRows[0];

    // Case A: Join existing issue
    if (input.joinIssueId) {
      const { rows: targetIssueRows } = await client.query<{
        id: string;
        status: string;
        title: string;
        severity: any;
        context: any;
        affected_override: number | null;
        created_at: Date;
      }>(
        'SELECT id, status, title, severity, context, affected_override, created_at FROM issues WHERE id = $1 AND organization_id = $2 FOR UPDATE',
        [input.joinIssueId, input.organizationId]
      );

      if (targetIssueRows.length === 0) {
        throw validationError('Issue to join does not exist.');
      }
      const targetIssue = targetIssueRows[0];

      // Join constraint: allowed only while target status in {REPORTED..IN_PROGRESS, REOPENED}
      const joinableStatuses = [
        'REPORTED',
        'VERIFICATION',
        'GROUPED',
        'PRIORITIZED',
        'ASSIGNED',
        'IN_PROGRESS',
        'REOPENED',
      ];
      if (!joinableStatuses.includes(targetIssue.status)) {
        throw conflict(
          `Cannot join issue in status ${targetIssue.status}. A new report must be created.`
        );
      }

      const newCompId = crypto.randomUUID();

      // Insert complaint
      await client.query(
        `INSERT INTO complaints (
           id, organization_id, issue_id, citizen_id, ward_id, category_id,
           description, lat, lng, is_primary, joined_existing, is_demo,
           address, city, district, state, country, postal_code, location_method, location_confirmed
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 1, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          newCompId,
          input.organizationId,
          targetIssue.id,
          input.citizenId,
          input.wardId,
          input.categoryId,
          input.description,
          lat,
          lng,
          input.isDemo ? 1 : 0,
          address,
          city,
          district,
          state,
          country,
          postalCode,
          locationMethod,
          locationConfirmed ? 1 : 0,
        ]
      );

      // Insert media rows
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const saved = savedFiles[i];
        const mediaId = crypto.randomUUID();
        await client.query(
          `INSERT INTO media (
             id, organization_id, uploader_id, kind, complaint_id, issue_id,
             storage_path, mime, size_bytes, original_name
           ) VALUES ($1, $2, $3, 'COMPLAINT', $4, $5, $6, $7, $8, $9)`,
          [
            mediaId,
            input.organizationId,
            input.citizenId,
            newCompId,
            targetIssue.id,
            saved.storagePath,
            file.mime,
            file.sizeBytes,
            file.originalName,
          ]
        );
      }

      // Recalculate priority
      const { rows: countRows } = await client.query<{ count: string }>(
        'SELECT COUNT(DISTINCT citizen_id) as count FROM complaints WHERE issue_id = $1',
        [targetIssue.id]
      );
      const distinctReporters = parseInt(countRows[0].count, 10);
      const affectedCount = targetIssue.affected_override ?? distinctReporters;

      const priorityResult = calculatePriority({
        severity: targetIssue.severity,
        severityReviewed: false,
        affectedCount,
        categoryScore: category.category_score,
        categoryName: category.name,
        context: targetIssue.context,
        createdAt: new Date(targetIssue.created_at),
      });

      await client.query(
        `UPDATE issues
         SET priority_score = $1, priority_band = $2, priority_breakdown = $3, updated_at = NOW()
         WHERE id = $4`,
        [
          priorityResult.score,
          priorityResult.band,
          JSON.stringify(priorityResult.breakdown),
          targetIssue.id,
        ]
      );

      // Event: REPORT_ADDED
      await client.query(
        `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, note, metadata)
         VALUES ($1, $2, 'CITIZEN', 'REPORT_ADDED', $3, $4)`,
        [
          targetIssue.id,
          input.citizenId,
          'A citizen joined this issue with an additional report.',
          JSON.stringify({ complaint_id: newCompId }),
        ]
      );

      return getCitizenIssueView(client, newCompId, input.citizenId);
    }

    // Case B: Create new issue (Automatic pipeline REPORTED -> VERIFICATION -> GROUPED -> PRIORITIZED)
    const title = `${category.name} in ${ward.name}`;

    // Summary (try AI, fallback to template)
    let summary: string | null = null;
    let summarySource: 'ai' | 'fallback' = 'fallback';
    const aiSum = await aiSummarize(input.description, ward.name, category.name);
    if (aiSum) {
      summary = aiSum;
      summarySource = 'ai';
    } else {
      summary = generateFallbackSummary(input.description);
      summarySource = 'fallback';
    }

    // Insert issue with initial status REPORTED
    validateTransition({ fromStatus: null, toStatus: 'REPORTED', actorRole: 'CITIZEN' });

    const newIssueId = crypto.randomUUID();
    const newCompId = crypto.randomUUID();
    const now = new Date();

    const initialPriority = calculatePriority({
      severity: 'SMALL_LOCAL',
      severityReviewed: false,
      affectedCount: 1,
      categoryScore: category.category_score,
      categoryName: category.name,
      context: 'NORMAL',
      createdAt: now,
    });

    await client.query(
      `INSERT INTO issues (
         id, organization_id, ward_id, category_id, status, title, summary, summary_source,
         lat, lng, severity, context, is_demo,
         address, city, district, state, country, postal_code,
         priority_score, priority_band, priority_breakdown, verification_flags
       ) VALUES ($1, $2, $3, $4, 'REPORTED', $5, $6, $7, $8, $9, 'SMALL_LOCAL', 'NORMAL', $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        newIssueId,
        input.organizationId,
        input.wardId,
        input.categoryId,
        title,
        summary,
        summarySource,
        lat,
        lng,
        input.isDemo ? 1 : 0,
        address,
        city,
        district,
        state,
        country,
        postalCode,
        initialPriority.score,
        initialPriority.band,
        JSON.stringify(initialPriority.breakdown),
        JSON.stringify([]),
      ]
    );

    // Insert primary complaint
    await client.query(
      `INSERT INTO complaints (
         id, organization_id, issue_id, citizen_id, ward_id, category_id,
         description, lat, lng, is_primary, joined_existing, is_demo,
         address, city, district, state, country, postal_code, location_method, location_confirmed
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, 0, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        newCompId,
        input.organizationId,
        newIssueId,
        input.citizenId,
        input.wardId,
        input.categoryId,
        input.description,
        lat,
        lng,
        input.isDemo ? 1 : 0,
        address,
        city,
        district,
        state,
        country,
        postalCode,
        locationMethod,
        locationConfirmed ? 1 : 0,
      ]
    );

    // Set primary_complaint_id
    await client.query('UPDATE issues SET primary_complaint_id = $1 WHERE id = $2', [
      newCompId,
      newIssueId,
    ]);

    // Save media rows
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      const saved = savedFiles[i];
      const mediaId = crypto.randomUUID();
      await client.query(
        `INSERT INTO media (
           id, organization_id, uploader_id, kind, complaint_id, issue_id,
           storage_path, mime, size_bytes, original_name
         ) VALUES ($1, $2, $3, 'COMPLAINT', $4, $5, $6, $7, $8, $9)`,
        [
          mediaId,
          input.organizationId,
          input.citizenId,
          newCompId,
          newIssueId,
          saved.storagePath,
          file.mime,
          file.sizeBytes,
          file.originalName,
        ]
      );
    }

    // Event: REPORTED
    await client.query(
      `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, from_status, to_status, note, metadata)
       VALUES ($1, $2, 'CITIZEN', 'STATUS_CHANGE', NULL, 'REPORTED', 'Complaint submitted by citizen.', '{}')`,
      [newIssueId, input.citizenId]
    );

    // Stage 2: VERIFICATION (soft flags)
    validateTransition({ fromStatus: 'REPORTED', toStatus: 'VERIFICATION', actorRole: 'SYSTEM' });
    const flags: string[] = [];
    if (input.files.length === 0) {
      flags.push('NO_MEDIA');
    }
    if (ward.radius_m) {
      const dist = haversineDistanceMeters(lat, lng, ward.center_lat, ward.center_lng);
      if (dist > ward.radius_m) {
        flags.push('LOCATION_FAR_FROM_WARD');
      }
    }

    await client.query(
      `UPDATE issues SET status = 'VERIFICATION', verification_flags = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(flags), newIssueId]
    );
    await client.query(
      `INSERT INTO issue_events (issue_id, actor_role, event_type, from_status, to_status, note, metadata)
       VALUES ($1, 'SYSTEM', 'STATUS_CHANGE', 'REPORTED', 'VERIFICATION', 'Automatic verification checks completed.', $2)`,
      [newIssueId, JSON.stringify({ flags })]
    );

    // Stage 3: GROUPED (similarity evaluation)
    validateTransition({ fromStatus: 'VERIFICATION', toStatus: 'GROUPED', actorRole: 'SYSTEM' });
    const simResult = await findSimilarIssues(
      client,
      input.organizationId,
      input.categoryId,
      input.description,
      lat,
      lng
    );

    const simSugId = crypto.randomUUID();
    await client.query(
      `INSERT INTO ai_suggestions (id, organization_id, kind, method, complaint_id, issue_id, payload)
       VALUES ($1, $2, 'SIMILAR_ISSUE', $3, $4, $5, $6)`,
      [
        simSugId,
        input.organizationId,
        simResult.method,
        newCompId,
        newIssueId,
        JSON.stringify(simResult.matches),
      ]
    );

    const groupNote =
      simResult.matches.length > 0
        ? `${simResult.matches.length} similar issue(s) flagged for admin review.`
        : 'Issue classified as standalone.';

    await client.query(
      `UPDATE issues SET status = 'GROUPED', updated_at = NOW() WHERE id = $1`,
      [newIssueId]
    );
    await client.query(
      `INSERT INTO issue_events (issue_id, actor_role, event_type, from_status, to_status, note, metadata)
       VALUES ($1, 'SYSTEM', 'STATUS_CHANGE', 'VERIFICATION', 'GROUPED', $2, '{}')`,
      [newIssueId, groupNote]
    );

    // Stage 4: PRIORITIZED (Rule-based priority)
    validateTransition({ fromStatus: 'GROUPED', toStatus: 'PRIORITIZED', actorRole: 'SYSTEM' });
    const priorityResult = calculatePriority({
      severity: 'SMALL_LOCAL',
      severityReviewed: false,
      affectedCount: 1,
      categoryScore: category.category_score,
      categoryName: category.name,
      context: 'NORMAL',
      createdAt: now,
    });

    await client.query(
      `UPDATE issues
       SET status = 'PRIORITIZED',
           priority_score = $1,
           priority_band = $2,
           priority_breakdown = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [
        priorityResult.score,
        priorityResult.band,
        JSON.stringify(priorityResult.breakdown),
        newIssueId,
      ]
    );
    await client.query(
      `INSERT INTO issue_events (issue_id, actor_role, event_type, from_status, to_status, note, metadata)
       VALUES ($1, 'SYSTEM', 'STATUS_CHANGE', 'GROUPED', 'PRIORITIZED', 'Initial priority computed.', $2)`,
      [newIssueId, JSON.stringify(priorityResult.breakdown)]
    );

    // Audit summary suggestion
    const sumSugId = crypto.randomUUID();
    await client.query(
      `INSERT INTO ai_suggestions (id, organization_id, kind, method, complaint_id, issue_id, payload)
       VALUES ($1, $2, 'SUMMARY', $3, $4, $5, $6)`,
      [
        sumSugId,
        input.organizationId,
        summarySource === 'ai' ? 'llm' : 'template',
        newCompId,
        newIssueId,
        JSON.stringify({ summary }),
      ]
    );

    return getCitizenIssueView(client, newCompId, input.citizenId);
  } catch (err) {
    // Cleanup any files written to disk
    for (const saved of savedFiles) {
      await deleteFileFromDisk(saved.storagePath);
    }
    throw err;
  }
}
