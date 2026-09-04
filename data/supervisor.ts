import { Collaboration, DailyReport, Labourer, LabourTeam, SupervisorTask } from "@/types/supervisor";

export const labourTeams: LabourTeam[] = [
  { id: "team-shutter", name: "Shuttering Team A", trade: "Formwork & shuttering", members: 12, lead: "Ravi Kumar", phone: "+91 98765 11220", zone: "Platform level", availability: "Available", activeTasks: 2 },
  { id: "team-rebar", name: "Rebar Crew B", trade: "Reinforcement", members: 10, lead: "Imran Sheikh", phone: "+91 98765 11221", zone: "Concourse level", availability: "Limited", activeTasks: 4 },
  { id: "team-concrete", name: "Concrete Gang C", trade: "Concreting", members: 14, lead: "Sanjay Yadav", phone: "+91 98765 11222", zone: "Platform level", availability: "Engaged", activeTasks: 5 },
  { id: "team-electric", name: "Electrical Team D", trade: "Cable & conduit", members: 8, lead: "Anil Verma", phone: "+91 98765 11223", zone: "East block", availability: "Available", activeTasks: 1 },
  { id: "team-finish", name: "Finishing Crew E", trade: "Masonry & finishing", members: 9, lead: "Mahesh Patel", phone: "+91 98765 11224", zone: "West block", availability: "Available", activeTasks: 2 },
];

export const labourers: Labourer[] = [
  { id: "labourer-001", name: "Ramesh Patil", trade: "Shuttering carpenter", teamId: "team-shutter", phone: "+91 98765 11231", zone: "Platform level", availability: "Available", activeTasks: 1 },
  { id: "labourer-002", name: "Suresh Nair", trade: "Shuttering carpenter", teamId: "team-shutter", phone: "+91 98765 11232", zone: "Platform level", availability: "Available", activeTasks: 1 },
  { id: "labourer-003", name: "Arjun Singh", trade: "Steel fixer", teamId: "team-rebar", phone: "+91 98765 11233", zone: "Concourse level", availability: "Limited", activeTasks: 3 },
  { id: "labourer-004", name: "Karan Mehta", trade: "Steel fixer", teamId: "team-rebar", phone: "+91 98765 11234", zone: "Concourse level", availability: "Available", activeTasks: 1 },
  { id: "labourer-005", name: "Deepak Joshi", trade: "Concreting mason", teamId: "team-concrete", phone: "+91 98765 11235", zone: "Platform level", availability: "Engaged", activeTasks: 4 },
  { id: "labourer-006", name: "Manoj Das", trade: "Electrician", teamId: "team-electric", phone: "+91 98765 11236", zone: "East block", availability: "Available", activeTasks: 1 },
  { id: "labourer-007", name: "Prakash Rao", trade: "Electrician", teamId: "team-electric", phone: "+91 98765 11237", zone: "East block", availability: "Available", activeTasks: 0 },
  { id: "labourer-008", name: "Nitin Shah", trade: "Finishing mason", teamId: "team-finish", phone: "+91 98765 11238", zone: "West block", availability: "Available", activeTasks: 1 },
];

export const seededSupervisorTasks: SupervisorTask[] = [
  {
    id: "sup-task-001", title: "Complete beam B12 shuttering", description: "Finish the remaining formwork and arrange a level check before reinforcement starts.", location: "Platform level — Grid B12", dueDate: "2026-09-04", priority: "High", status: "Awaiting Approval",
    classification: { discipline: "Structural", level: 6, hierarchyLabel: "Structural Works › Superstructure › Beam Works", parentTaskId: "task-009", confidence: 94, reasoning: "Beam formwork is a specific structural field activity." }, suggestedLabourerId: "labourer-001", assignmentReason: "Ramesh Patil is available at platform level and is the least-loaded shuttering carpenter.", dispatchStatus: "Not sent", createdAt: "2026-09-04T08:30:00", source: "Manual",
  },
  {
    id: "sup-task-002", title: "Verify conduit placement before slab pour", description: "Check all electrical conduits and boxes at the east block slab before concrete is ordered.", location: "East block — Level 2", dueDate: "2026-09-04", priority: "Critical", status: "Assigned",
    classification: { discipline: "Electrical", level: 6, hierarchyLabel: "Electrical Works › LV Distribution › Conduit installation", parentTaskId: "task-010", confidence: 91, reasoning: "Conduit verification is an executable electrical activity." }, suggestedLabourerId: "labourer-006", assignedLabourerId: "labourer-006", assignmentReason: "Manoj Das is available in the east block and has conduit-installation experience.", dispatchStatus: "Read", createdAt: "2026-09-04T07:45:00", source: "Converse",
  },
  {
    id: "sup-task-003", title: "Prepare rebar for pier P07", description: "Cut, bend and stage reinforcement for the next pier lift.", location: "North concourse — Pier P07", dueDate: "2026-09-05", priority: "Medium", status: "In Progress",
    classification: { discipline: "Structural", level: 6, hierarchyLabel: "Structural Works › Substructure › Reinforcement", parentTaskId: "task-008", confidence: 96, reasoning: "A focused reinforcement activity belongs at L6." }, suggestedLabourerId: "labourer-004", assignedLabourerId: "labourer-004", assignmentReason: "Karan Mehta is a steel fixer available at the north concourse.", dispatchStatus: "Accepted", createdAt: "2026-09-03T16:10:00", source: "Manual",
  },
];

export const seededCollaborations: Collaboration[] = [
  { id: "collab-001", title: "Slab pour readiness", objective: "Verify conduit and embedded items before the Level 2 slab pour.", partner: "Anita Verma", partnerTeam: "Electrical Team D", dueDate: "2026-09-04", status: "Active", taskCount: 3, updates: 4 },
  { id: "collab-002", title: "Material access coordination", objective: "Clear crane access for reinforcement deliveries at the north concourse.", partner: "Vikram Singh", partnerTeam: "Logistics Team", dueDate: "2026-09-05", status: "Pending", taskCount: 2, updates: 1 },
];

export const seededReports: DailyReport[] = [
  { id: "report-001", date: "2026-09-03", shift: "Day", workforce: 53, completedWork: "Pier P06 reinforcement completed; formwork started for beam B12.", blockers: "Concrete pump was unavailable for 45 minutes.", safetyNote: "Toolbox talk completed for working-at-height controls.", status: "Submitted" },
];
