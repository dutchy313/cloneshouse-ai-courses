import { env } from '../config/env.js';

let cachedZoomToken = {
  accessToken: '',
  expiresAt: 0,
  apiUrl: 'https://api.zoom.us'
};

function hasZoomConfig() {
  return Boolean(env.zoomAccountId && env.zoomClientId && env.zoomClientSecret);
}

function cleanMeetingId(meetingId = '') {
  return String(meetingId).replace(/\s+/g, '');
}

function getMeetingIdForCourse(course) {
  if (course.slug === 'custom-gpts-for-evaluators') {
    return cleanMeetingId(env.zoomCustomGptsMeetingId);
  }

  if (course.slug === 'ai-agents-for-evaluators') {
    return cleanMeetingId(env.zoomAiAgentsMeetingId);
  }

  return '';
}

async function parseZoomResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function getZoomAccessToken() {
  if (!hasZoomConfig()) {
    return {
      configured: false,
      accessToken: '',
      apiUrl: 'https://api.zoom.us'
    };
  }

  if (cachedZoomToken.accessToken && Date.now() < cachedZoomToken.expiresAt) {
    return {
      configured: true,
      accessToken: cachedZoomToken.accessToken,
      apiUrl: cachedZoomToken.apiUrl
    };
  }

  const basicToken = Buffer.from(`${env.zoomClientId}:${env.zoomClientSecret}`).toString('base64');

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(env.zoomAccountId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const result = await parseZoomResponse(response);

  if (!response.ok) {
    console.error('Zoom token error:', result);
    throw new Error(result.reason || result.message || 'Zoom access token request failed');
  }

  cachedZoomToken = {
    accessToken: result.access_token,
    expiresAt: Date.now() + Math.max(Number(result.expires_in || 3600) - 60, 60) * 1000,
    apiUrl: result.api_url || 'https://api.zoom.us'
  };

  return {
    configured: true,
    accessToken: cachedZoomToken.accessToken,
    apiUrl: cachedZoomToken.apiUrl
  };
}

export async function registerParticipantOnZoom({ registration, course }) {
  const meetingId = getMeetingIdForCourse(course);

  if (!hasZoomConfig()) {
    console.warn('ZOOM MOCK: Zoom credentials are not configured.');

    return {
      registered: false,
      mocked: true,
      meetingId,
      registrantId: '',
      joinUrl: '',
      message: 'Zoom credentials are not configured.'
    };
  }

  if (!meetingId) {
    console.warn('ZOOM SKIPPED: No Zoom meeting ID configured for course.', {
      courseSlug: course.slug
    });

    return {
      registered: false,
      mocked: false,
      meetingId: '',
      registrantId: '',
      joinUrl: '',
      message: `No Zoom meeting ID configured for ${course.slug}.`
    };
  }

  const token = await getZoomAccessToken();

  const response = await fetch(`${token.apiUrl}/v2/meetings/${encodeURIComponent(meetingId)}/registrants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      first_name: registration.firstName,
      last_name: registration.lastName,
      email: registration.email,
      phone: registration.phone,
      org: registration.organization || undefined,
      job_title: registration.jobTitle || undefined,
      auto_approve: true
    })
  });

  const result = await parseZoomResponse(response);

  if (!response.ok) {
    console.error('Zoom registrant error:', {
      status: response.status,
      courseSlug: course.slug,
      meetingId,
      result
    });

    throw new Error(result.message || result.reason || 'Zoom meeting registration failed');
  }

  return {
    registered: Boolean(result.join_url),
    mocked: false,
    meetingId,
    registrantId: result.registrant_id || '',
    joinUrl: result.join_url || '',
    raw: result
  };
}

export async function testZoomConnection() {
  const token = await getZoomAccessToken();

  if (!token.configured) {
    return {
      ok: false,
      mocked: true,
      message: 'Zoom credentials are not configured.'
    };
  }

  const response = await fetch(`${token.apiUrl}/v2/users/me`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`
    }
  });

  const result = await parseZoomResponse(response);

  if (!response.ok) {
    console.error('Zoom connection test error:', result);
    throw new Error(result.message || result.reason || 'Zoom connection test failed');
  }

  return {
    ok: true,
    mocked: false,
    user: {
      id: result.id,
      email: result.email,
      displayName: result.display_name
    }
  };
}