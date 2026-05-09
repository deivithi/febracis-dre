/**
 * Classes for workflow-locked submission workspace bodies (not the status header row).
 * Keep in sync with `isLockedSubmissionStatus` in `submissionStatus.ts`.
 */
export const SUBMISSION_WORKSPACE_LOCKED_BODY_CLASSES =
  'pointer-events-none select-none opacity-70 transition-opacity duration-200 [&_button]:cursor-not-allowed [&_input]:cursor-not-allowed [&_textarea]:cursor-not-allowed';

export const SUBMISSION_WORKSPACE_BODY_TRANSITION = 'transition-opacity duration-200';
