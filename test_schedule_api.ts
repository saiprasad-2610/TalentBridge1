import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/jobs/applications/schedule-interview', {
      applicationId: 1, // replace with an actual one or just test
      stageId: 1,
      interviewType: 'INTERVIEW_ONLINE',
      locationOrLink: 'WebRTC Live Call Room',
      scheduledAt: '2026-06-22T22:18:00.000Z',
      notes: ''
    });
    console.log("Success:", res.data);
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

test();
