import { sendAdmissionEmail, sendAdminAlert } from './email.service.js';
import { syncAdmissionToGoogleSheets } from './googleSheets.service.js';
import { registerParticipantOnZoom } from './zoom.service.js';

export async function completeAdmissionAfterPayment({ registration, course, payment }) {
  try {
    registration.zoomStatus = 'pending';
    await registration.save();

    const zoomResult = await registerParticipantOnZoom({
      registration,
      course
    });

    registration.zoomStatus = zoomResult?.registered ? 'registered' : 'failed';
    registration.zoomMeetingId = zoomResult?.meetingId || '';
    registration.zoomRegistrantId = zoomResult?.registrantId || '';
    registration.zoomJoinUrl = zoomResult?.joinUrl || '';
    await registration.save();

    try {
      await syncAdmissionToGoogleSheets({
        registration,
        course,
        payment
      });
    } catch (syncError) {
      console.warn('Google Sheets admission sync failed:', syncError.message);
    }

    await sendAdmissionEmail({
      registration,
      course,
      payment,
      zoomJoinUrl: registration.zoomJoinUrl
    });

    if (!zoomResult?.registered) {
      await sendAdminAlert({
        subject: `Zoom registration needs attention: ${course.title}`,
        details: {
          course: course.title,
          courseDate: course.dateLabel,
          courseTime: course.timeLabel,
          registrationId: registration._id.toString(),
          fullName: registration.fullName,
          email: registration.email,
          phone: registration.phone,
          whatsapp: registration.whatsapp,
          country: registration.country,
          paymentStatus: registration.paymentStatus,
          zoomStatus: registration.zoomStatus,
          zoomMeetingId: registration.zoomMeetingId,
          reason: zoomResult?.message || 'Zoom did not return a join URL.'
        }
      });
    }

    return {
      completed: true,
      zoomStatus: registration.zoomStatus,
      zoomMeetingId: registration.zoomMeetingId,
      zoomRegistrantId: registration.zoomRegistrantId,
      zoomJoinUrl: registration.zoomJoinUrl
    };
  } catch (error) {
    registration.zoomStatus = 'failed';
    await registration.save();

    try {
      await syncAdmissionToGoogleSheets({
        registration,
        course,
        payment
      });
    } catch (syncError) {
      console.warn('Google Sheets failed admission sync failed:', syncError.message);
    }

    await sendAdminAlert({
      subject: 'Admission completion failed after payment',
      details: {
        course: course.title,
        courseDate: course.dateLabel,
        courseTime: course.timeLabel,
        registrationId: registration._id.toString(),
        fullName: registration.fullName,
        email: registration.email,
        phone: registration.phone,
        whatsapp: registration.whatsapp,
        country: registration.country,
        organization: registration.organization,
        jobTitle: registration.jobTitle,
        paymentStatus: registration.paymentStatus,
        zoomStatus: registration.zoomStatus,
        error: error.message
      }
    });

    throw error;
  }
}