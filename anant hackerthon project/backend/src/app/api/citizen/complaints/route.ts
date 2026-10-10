import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { submitComplaint } from '@/services/complaintService';
import { errorResponse, okResponse } from '@/lib/http';
import { parseAndValidateUploads } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['CITIZEN']);
    const { rows } = await query(
      `SELECT c.id as complaint_id, c.complaint_no, c.issue_id, c.description, c.created_at,
              i.title, i.status, cat.name as category_name, w.name as ward_name,
              i.priority_override_band, i.priority_band
       FROM complaints c
       JOIN issues i ON i.id = c.issue_id
       JOIN categories cat ON cat.id = i.category_id
       JOIN wards w ON w.id = i.ward_id
       WHERE c.citizen_id = $1 AND c.organization_id = $2
       ORDER BY c.created_at DESC`,
      [user.id, user.organization_id]
    );

    const complaints = rows.map(r => ({
      complaint_id: r.complaint_id,
      complaint_no: r.complaint_no,
      issue_id: r.issue_id,
      title: r.title,
      description: r.description,
      status: r.status,
      status_label: r.status.replace(/_/g, ' '),
      created_at: r.created_at,
      category_name: r.category_name,
      ward_name: r.ward_name,
      priority_band: r.priority_override_band || r.priority_band,
    }));

    return okResponse({ complaints });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['CITIZEN']);
    const formData = await req.formData();
    const description = formData.get('description') as string;
    const categoryId = formData.get('category_id') as string;
    const wardId = formData.get('ward_id') as string;
    const lat = parseFloat(formData.get('lat') as string);
    const lng = parseFloat(formData.get('lng') as string);
    const address = (formData.get('address') as string) || null;
    const city = (formData.get('city') as string) || null;
    const district = (formData.get('district') as string) || null;
    const state = (formData.get('state') as string) || null;
    const country = (formData.get('country') as string) || null;
    const postalCode = (formData.get('postal_code') as string) || null;
    const locationMethod = ((formData.get('location_method') as string) || 'MANUAL') as 'GPS' | 'MANUAL';
    const rawFiles = formData.getAll('media') as File[];

    const validatedFiles = await parseAndValidateUploads(rawFiles);

    const result = await withTransaction(async (client) => {
      return await submitComplaint(client, {
        organizationId: user.organization_id,
        citizenId: user.id,
        categoryId,
        wardId,
        description,
        lat,
        lng,
        address,
        city,
        district,
        state,
        country,
        postalCode,
        locationMethod,
        files: validatedFiles,
      });
    });

    return okResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
