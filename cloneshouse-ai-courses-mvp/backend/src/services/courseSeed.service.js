import { Course } from '../models/Course.js';

const courses = [
  {
    slug: 'custom-gpts-for-evaluators',
    title: 'How to Create Custom GPTs for Evaluators',
    subtitle: 'A practical masterclass for MEL professionals',
    shortDescription:
      'Learn how to create Custom GPTs that understand evaluation tasks, follow your preferred workflows, and support survey design, theories of change, qualitative review, reporting, and implementation support.',
    dateLabel: 'Thursday, August 27, 2026',
    timeLabel: '5pm–7pm WAT / 12pm–2pm New York / 9:30pm–11:30pm India',
    durationLabel: '2 hours',

    standardPriceUsd: 120,
    earlyBirdPriceUsd: 100,
    standardPriceNgn: 163000,
    earlyBirdPriceNgn: 140000,

    earlyBirdEndsAt: new Date('2026-08-06T23:59:59.000Z'),
    imageUrl:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Professionals collaborating during a practical training session',
    badge: 'August Masterclass',
    isActive: true,
    curriculum: [
      {
        title: 'Module 1 — Foundations & Smart Use of AI in Evaluation',
        lessons: [
          'Why generic AI fails in evaluation: hallucinations, template blindness, and inconsistency.',
          'Where AI fits in the evaluation workflow: design, analysis, reporting, and learning.',
          'Chat prompts vs Custom GPTs: when to use one-off prompts and when to build a reusable GPT.'
        ]
      },
      {
        title: 'Module 2 — Build Your Custom GPT',
        lessons: [
          'The EVAL-GPT framework: Expert Role + Variables + Actions + Limits + Format.',
          'Writing instructions that actually work using Role + Task + Context + Format.',
          'Adding knowledge sources, testing your GPT, and checking for hallucinations.'
        ]
      },
      {
        title: 'Module 3 — Apply, Validate & Use Responsibly',
        lessons: [
          'Practical M&E use cases: theories of change, indicators, coding, summaries, and reporting.',
          'Risks and governance: bias, hallucinations, privacy, and over-reliance.',
          'Deploying your GPT for individual or team use with a simple adoption strategy.'
        ]
      }
    ]
  },
  {
    slug: 'ai-agents-for-evaluators',
    title: 'AI Agents for Evaluators',
    subtitle: 'Build No-Code AI Agents for M&E Workflows',
    shortDescription:
      'Learn how to design, build, test, and use practical AI agents that support evaluation design, reporting, qualitative coding, quantitative analysis, data quality review, indicator tracking, donor updates, learning, and follow-up.',
    dateLabel: 'Thursday, September 24, 2026',
    timeLabel: '4pm–7pm WAT / 11am–2pm New York / 8:30pm–11:30pm India',
    durationLabel: '3 hours',

    standardPriceUsd: 250,
    earlyBirdPriceUsd: 200,
    standardPriceNgn: 340000,
    earlyBirdPriceNgn: 280000,

    earlyBirdEndsAt: new Date('2026-09-03T23:59:59.000Z'),
    imageUrl:
      'https://images.unsplash.com/photo-1526253038957-bce54e05968e?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Professionals discussing ideas in a collaborative workshop',
    badge: 'September Masterclass',
    isActive: true,
    curriculum: [
      {
        title: 'Module 1 — Foundations of AI Agents for Evaluators',
        lessons: [
          'Understand what AI agents are and how they differ from simple prompts.',
          'Learn how reusable evaluation agents can reduce repetitive work.',
          'Identify where human judgment and validation must remain central.'
        ]
      },
      {
        title: 'Module 2 — Design and Specification',
        lessons: [
          'Map M&E workflows before building an AI agent.',
          'Define inputs, outputs, risks, and quality checks.',
          'Create a clear agent specification for practical evaluation tasks.'
        ]
      },
      {
        title: 'Module 3 — Implementation and Deployment',
        lessons: [
          'Build no-code agents with ChatGPT, Claude, and workflow automation tools.',
          'Set up practical agent behaviour for repeated M&E tasks.',
          'Prepare agents for individual, team, or organizational use.'
        ]
      },
      {
        title: 'Module 4 — Verification and Reliability',
        lessons: [
          'Check AI outputs against source evidence.',
          'Create validation checklists and quality gates.',
          'Reduce risks from hallucinations, bias, and unsupported claims.'
        ]
      },
      {
        title: 'Module 5 — Practical AI Agents for M&E Workflows',
        lessons: [
          'Evaluation Design Agent for questions, criteria, methods, and matrix rows.',
          'Reporting Agent for evidence-based summaries, briefs, and donor updates.',
          'Qualitative Coding, Quantitative Analysis, Data Quality, Indicator Tracking, and Learning Agents.'
        ]
      }
    ]
  }
];

export async function seedDefaultCourses() {
  await Promise.all(
    courses.map((course) =>
      Course.updateOne(
        { slug: course.slug },
        {
          $set: course
        },
        { upsert: true }
      )
    )
  );

  console.log('Default courses seeded');
}