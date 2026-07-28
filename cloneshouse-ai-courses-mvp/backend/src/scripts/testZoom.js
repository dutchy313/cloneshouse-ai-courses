import { getZoomAccessToken, registerParticipantOnZoom } from '../services/zoom.service.js';

const courseSlug = process.argv[2];
const email = process.argv[3];
const firstName = process.argv[4] || 'Test';
const lastName = process.argv[5] || 'Participant';

if (!courseSlug || !email) {
  console.error('Please provide a course slug and email address.');
  console.error('Example: npm run zoom:test -- custom-gpts-for-evaluators learner@example.com Jane Doe');
  console.error('Example: npm run zoom:test -- ai-agents-for-evaluators learner@example.com Jane Doe');
  process.exit(1);
}

const courseTitleBySlug = {
  'custom-gpts-for-evaluators': 'How to Create Custom GPTs for Evaluators',
  'ai-agents-for-evaluators': 'AI Agents for Evaluators'
};

async function main() {
  const token = await getZoomAccessToken();

  console.log('Zoom token result:', {
    configured: token.configured,
    apiUrl: token.apiUrl,
    hasAccessToken: Boolean(token.accessToken)
  });

  const fakeCourse = {
    slug: courseSlug,
    title: courseTitleBySlug[courseSlug] || courseSlug,
    dateLabel: '',
    timeLabel: ''
  };

  const fakeRegistration = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    phone: '+2348137617995',
    organization: 'Cloneshouse Test',
    jobTitle: 'Test Participant'
  };

  const result = await registerParticipantOnZoom({
    registration: fakeRegistration,
    course: fakeCourse
  });

  console.log('Zoom registrant result:', {
    registered: result.registered,
    mocked: result.mocked,
    meetingId: result.meetingId,
    registrantId: result.registrantId,
    joinUrl: result.joinUrl
  });

  process.exit(0);
}

main().catch((error) => {
  console.error('Zoom test failed:', error.message);
  process.exit(1);
});