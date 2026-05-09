export interface SubmissionLineCommentRow {
  id: string;
  submission_id: string;
  line_code: string;
  author_id: string;
  author_display_name: string;
  parent_id: string | null;
  thread_root_id: string;
  content: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  critical: boolean;
  deleted_at: string | null;
  created_at: string;
}
