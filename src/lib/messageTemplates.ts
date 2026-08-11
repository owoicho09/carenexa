export type MessageTemplate = {
  key: string;
  label: string;
  subject?: string; // used for email
  body: (firstName: string) => string;
};

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: "appointment_reminder",
    label: "Appointment reminder",
    subject: "Your upcoming appointment at CareNexa Hospital",
    body: (name) =>
      `Hi ${name}, this is a reminder of your upcoming appointment at CareNexa Hospital. Please arrive 15 minutes early with your hospital card. Reply to this message if you need to reschedule.`,
  },
  {
    key: "results_ready",
    label: "Results ready",
    subject: "Your test results are ready",
    body: (name) =>
      `Hi ${name}, your recent test results are ready. Please visit CareNexa Hospital or call us so your doctor can go through them with you.`,
  },
  {
    key: "medication_reminder",
    label: "Medication reminder",
    subject: "Medication reminder from CareNexa Hospital",
    body: (name) =>
      `Hi ${name}, this is a reminder to take your prescribed medication as directed by your doctor. Contact CareNexa Hospital if you have any side effects or questions.`,
  },
  {
    key: "follow_up_due",
    label: "Follow-up due",
    subject: "Your follow-up visit is due",
    body: (name) =>
      `Hi ${name}, our records show you have a follow-up visit due at CareNexa Hospital. Please book an appointment at your earliest convenience.`,
  },
];
