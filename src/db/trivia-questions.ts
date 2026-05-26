import { sql } from './index.ts';

export interface TriviaQuestionRow {
  question_id: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

/**
 * Returns a random sample of trivia questions. The `correct_answer` column is
 * intentionally not selected — clients receive only the options, and answer
 * correctness is evaluated server-side at game-end.
 */
export async function getRandomTriviaQuestions(limit: number): Promise<TriviaQuestionRow[]> {
  return sql<TriviaQuestionRow[]>`
    SELECT question_id, category, difficulty, question,
           option_a, option_b, option_c, option_d
    FROM   football_trivia_questions
    ORDER BY random()
    LIMIT  ${limit}
  `;
}

/**
 * Counts the number of distinct trivia questions a game play answered
 * correctly. A question with multiple answer events is counted at most once,
 * and only the first answer per question is honored (DISTINCT ON ordered by
 * event_time) — clients can't overwrite a wrong answer with a correct one.
 */
export async function countCorrectTriviaAnswers(gamePlayId: string): Promise<number> {
  const result = await sql<{ correct: number }[]>`
    WITH first_answer AS (
      SELECT DISTINCT ON (intval)
             intval AS question_id,
             textval AS picked
      FROM   game_ingame_events
      WHERE  game_play_id = ${gamePlayId}
        AND  event_type = 'trivia_answer'
        AND  intval IS NOT NULL
      ORDER BY intval, event_time ASC
    )
    SELECT COUNT(*)::int AS correct
    FROM   first_answer fa
    JOIN   football_trivia_questions q ON q.question_id = fa.question_id
    WHERE  fa.picked = q.correct_answer
  `;
  return result[0]?.correct ?? 0;
}
