import { describe, expect, it } from 'vitest';
import {
  formatSubmissionMutationError,
  isConcurrentModificationError,
  SUBMISSION_CONFLICT_USER_MESSAGE,
} from '../../src/features/submissions/submissionConcurrency';

describe('submissionConcurrency', () => {
  it('detecta CONCURRENT_MODIFICATION', () => {
    expect(
      isConcurrentModificationError(
        new Error('Não foi possível salvar. CONCURRENT_MODIFICATION: revision esperada 2, atual 3'),
      ),
    ).toBe(true);
    expect(isConcurrentModificationError(new Error('outro erro'))).toBe(false);
  });

  it('formata mensagem amigável para conflito', () => {
    expect(
      formatSubmissionMutationError(
        new Error('CONCURRENT_MODIFICATION: revision esperada 1, atual 2'),
        'fallback',
      ),
    ).toBe(SUBMISSION_CONFLICT_USER_MESSAGE);
  });
});
