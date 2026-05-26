-- ============================================================
-- CupMaster Backend – PostgreSQL Schema
-- ============================================================

-- Insert only design, no updates or deletes (except user_numbers and fixture_live_results )
-- All IDs are k-orderd 63 bit (42-bit ms timestamp | 21-bit random)

-- Users (no-update)
CREATE TABLE users (
    user_id      BIGINT      DEFAULT generate_id() PRIMARY KEY,
    address      TEXT        NOT NULL UNIQUE  CHECK (address ~ '^0x[0-9a-f]{40}$'),
    user_source  TEXT        NOT NULL CHECK (user_source IN ('mobile-web', 'web', 'minipay')),
    wallet_info  TEXT        NOT NULL
);

-- A new record is inserted here on a user updated (no-update)
CREATE TABLE user_mutable_data (
    user_change_id  BIGINT    DEFAULT generate_id() PRIMARY KEY,
    user_id         BIGINT    NOT NULL REFERENCES users(user_id),
    name            TEXT      NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
    flag            TEXT      NOT NULL, -- same as teams.logo
    is_banned       BOOLEAN   NOT NULL DEFAULT FALSE
);

-- Teams (Countries) (no-update, static data)
CREATE TABLE teams  (
    team_id      BIGINT      DEFAULT generate_id() PRIMARY KEY,
    api_team_id  INTEGER     NOT NULL UNIQUE, -- team.id from API
    team_name    TEXT        NOT NULL CHECK (char_length(team_name) >= 3 AND char_length(team_name) <= 50),
    country_code TEXT        NOT NULL, -- team.code (3-letter, e.g. "BRA")
    logo         TEXT        NOT NULL, -- team.logo
    group_name   TEXT        NOT NULL  -- standings[].group ("Group A" .. "Group L")
);

-- Matches (time and venue_city should be used for matching with fixtures) (no-update, static data)
CREATE TABLE match_schedules (
    match_number   INTEGER     PRIMARY KEY,    -- 1..104 (world cup matches ordered by date)
    match_time     TIMESTAMPTZ NOT NULL,
    round_type     TEXT        NOT NULL CHECK (round_type IN ('group', 'knockout')), -- derived from league.round
    round          TEXT        NOT NULL,       -- league.round ("Group Stage - 1", "Round of 16", ...)
    venue_name     TEXT        NOT NULL,       -- venue.name from API
    venue_city     TEXT        NOT NULL        -- venue.city from API
);

-- Fixtures (no-update)
CREATE TABLE fixtures (
    fixture_id      BIGINT      DEFAULT generate_id() PRIMARY KEY,
    api_fixture_id  INTEGER     NOT NULL UNIQUE,  -- API fixture.id
    match_number    INTEGER     NOT NULL REFERENCES match_schedules(match_number),
    team1_id        BIGINT      NOT NULL REFERENCES teams(team_id), -- home team on the API
    team2_id        BIGINT      NOT NULL REFERENCES teams(team_id)  -- away team on the API
);

-- Fixtures (no-update) (inserted when the match is completed)
CREATE TABLE fixture_results (
    fixture_result_id BIGINT      DEFAULT generate_id() PRIMARY KEY,
    fixture_id        BIGINT      NOT NULL UNIQUE REFERENCES fixtures(fixture_id),
    status_short      TEXT        NOT NULL CHECK (status_short IN ('FT', 'AET', 'PEN')),
    team1_score       INTEGER     NOT NULL CHECK (team1_score >= 0),
    team2_score       INTEGER     NOT NULL CHECK (team2_score >= 0)
);

-- Live results for fixtures, updated frequently during matches (updateable)
CREATE TABLE fixture_live_results (
    fixture_id         BIGINT      PRIMARY KEY REFERENCES fixtures(fixture_id),
    status_short       TEXT        NOT NULL CHECK (status_short IN ('NS', '1H', 'HT', '2H', 'ET', 'P', 'FT')),
    team1_score        INTEGER     NOT NULL CHECK (team1_score >= 0),
    team2_score        INTEGER     NOT NULL CHECK (team2_score >= 0),
    last_updated       TIMESTAMPTZ NOT NULL
);

-- tournaments (no-update)
CREATE TABLE tournaments (
    tournament_id           BIGINT DEFAULT generate_id() PRIMARY KEY,
    tournament_start_date   TIMESTAMPTZ   NOT NULL,
    tournament_end_date     TIMESTAMPTZ   NOT NULL
);

-- Tournament Results, added when processed (no-update) (one-to-one, enforced by unique FK)
CREATE TABLE tournament_results (
    tournament_result_id BIGINT DEFAULT generate_id() PRIMARY KEY,
    tournament_id        BIGINT NOT NULL UNIQUE REFERENCES tournaments(tournament_id),
    revenue              NUMERIC NOT NULL CHECK (revenue >= 0),
    inherited_revenue    NUMERIC NOT NULL CHECK (inherited_revenue >= 0), -- revenue inherited from previous tournament
    used_for_payout      NUMERIC NOT NULL CHECK (used_for_payout >= 0), -- portion of revenue used for payouts (after platform fee)
    processed_at         TIMESTAMPTZ GENERATED ALWAYS AS (date_from_id(tournament_result_id)) STORED
);

-- Individual game sessions, added when game starts (no-update)
CREATE TABLE game_plays (
    game_play_id        BIGINT      DEFAULT generate_id() PRIMARY KEY, -- has start_date in it
    user_id             BIGINT      NOT NULL REFERENCES users(user_id),
    game_type           INT         NOT NULL CHECK (game_type IN (101, 102, 103, 201, 202, 203)),
    tournament_id       BIGINT      NOT NULL REFERENCES tournaments(tournament_id),
    ip_address          INET
);

-- Game plays results (no-update) (one-to-one with game_plays, enforced by unique FK)
CREATE TABLE game_play_results (
    game_play_result_id BIGINT      DEFAULT generate_id() PRIMARY KEY,
    game_play_id        BIGINT      NOT NULL UNIQUE REFERENCES game_plays(game_play_id),
    score               INT         NOT NULL CHECK (score >= 0),
    ended_at            TIMESTAMPTZ GENERATED ALWAYS AS (date_from_id(game_play_result_id)) STORED
);

-- In-game events for analytics (no-update)
CREATE TABLE game_ingame_events (
    event_id           BIGINT      DEFAULT generate_id() PRIMARY KEY,
    game_play_id       BIGINT      NOT NULL REFERENCES game_plays(game_play_id),
    event_time         TIMESTAMPTZ NOT NULL,
    event_type         TEXT        NOT NULL,
    intval             INT,
    textval            TEXT,
    extra_data         JSONB
);

-- On-chain transactions (no-update) (revenue is present for buy transactions, otherwise 0)
CREATE TABLE user_transactions (
    transaction_id BIGINT      DEFAULT generate_id() PRIMARY KEY,
    user_id        BIGINT      NOT NULL REFERENCES users(user_id),
    tx_hash        TEXT        NOT NULL UNIQUE, -- uint256 as hex string
    tx_time        TIMESTAMPTZ NOT NULL, -- from block timestamp
    revenue        NUMERIC     NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    event_params   JSONB       NOT NULL
);

-- Energy issuance events,  (no-update)
CREATE TABLE energy_issuance (
    energy_issuance_id BIGINT      DEFAULT generate_id() PRIMARY KEY,
    user_id            BIGINT      NOT NULL REFERENCES users(user_id),
    issuance_type      TEXT        NOT NULL CHECK (issuance_type IN ('signup', 'buy_energy')),
    game_type          INT         NOT NULL CHECK (game_type IN (101, 102, 103, 201, 202, 203)),
    amount             INT         NOT NULL CHECK (amount > 0),
    transaction_id     BIGINT      REFERENCES user_transactions(transaction_id)
);

-- Inventory items (badges....) (no-update)
CREATE TABLE user_items (
    item_id               BIGINT      DEFAULT generate_id() PRIMARY KEY,
    user_id               BIGINT      NOT NULL REFERENCES users(user_id),
    item_type             INT         NOT NULL,
    acquisition_type      TEXT        NOT NULL CHECK (acquisition_type IN ('buy_package', 'achievement_reward')),
    buy_transaction_id    BIGINT      REFERENCES user_transactions(transaction_id)
);

-- Item usage records (no-update) (one per item, only for used items)
CREATE TABLE user_item_usages (
    item_usage_id  BIGINT       DEFAULT generate_id() PRIMARY KEY,
    item_id        BIGINT       NOT NULL UNIQUE REFERENCES user_items(item_id),
    usage_date     TIMESTAMPTZ GENERATED ALWAYS AS (date_from_id(item_usage_id)) STORED
);

-- Reward payouts (no-update)
CREATE TABLE user_payouts (
    payout_id            BIGINT      DEFAULT generate_id() PRIMARY KEY,
    user_id              BIGINT      NOT NULL REFERENCES users(user_id),
    payout_type          TEXT        NOT NULL CHECK (payout_type IN ('tournament_reward')),
    action_id            TEXT        NOT NULL UNIQUE,  -- unique uint256 as hex string
    amount               NUMERIC     NOT NULL,
    payment_token        SMALLINT    NOT NULL, -- 1=USDT, 2=USDC, 3=USDm
    signature            TEXT        NOT NULL,
    tournament_id        BIGINT      REFERENCES tournaments(tournament_id) -- for rewards
);

-- User claims (no-update) (one-to-one with payouts, enforced by unique FK)
CREATE TABLE user_claims (
    claim_id             BIGINT   DEFAULT generate_id() PRIMARY KEY,
    payout_id            BIGINT   NOT NULL UNIQUE REFERENCES user_payouts(payout_id),
    claim_transaction_id BIGINT   NOT NULL REFERENCES user_transactions(transaction_id)
);

-- Tournament total scores (no-update)
CREATE TABLE tournament_total_scores (
  tournament_score_id BIGINT   DEFAULT generate_id() PRIMARY KEY,
  user_id             BIGINT   NOT NULL REFERENCES users(user_id),
  tournament_id       BIGINT   NOT NULL REFERENCES tournaments(tournament_id),
  total_score         INT      NOT NULL CHECK (total_score >= 0),
  rank                INT      NOT NULL CHECK (rank > 0),
  UNIQUE (user_id, tournament_id)
);

-- Football trivia questions (no-update, static data, seeded from football_trivia_500.csv)
CREATE TABLE football_trivia_questions (
    question_id    INTEGER     PRIMARY KEY,
    category       TEXT        NOT NULL,
    difficulty     TEXT        NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    question       TEXT        NOT NULL,
    option_a       TEXT        NOT NULL,
    option_b       TEXT        NOT NULL,
    option_c       TEXT        NOT NULL,
    option_d       TEXT        NOT NULL,
    correct_answer CHAR(1)     NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D'))
);

-- User stats per gametype (updateable) (recreateable summary) (high-churn row → HOT-update friendly)
CREATE TABLE user_numbers (
    user_id           BIGINT  REFERENCES users(user_id),
    game_type         INT     NOT NULL CHECK (game_type IN (101, 102, 103, 201, 202, 203)),
    energy            INT     NOT NULL DEFAULT 0 CHECK (energy >= 0),
    games_played      INT     NOT NULL DEFAULT 0 CHECK (games_played >= 0),
    total_score       BIGINT  NOT NULL DEFAULT 0 CHECK (total_score  >= 0),
    PRIMARY KEY (user_id, game_type)
) WITH (fillfactor = 80);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX ON game_plays (user_id, tournament_id);
CREATE INDEX ON energy_issuance (user_id);
CREATE INDEX ON user_items (user_id);
CREATE INDEX ON user_payouts (user_id);
-- For user_mutable_data, we will often query the latest record for a user, so we index by user_id and user_change_id desc to optimize that query
CREATE INDEX idx_user_mutable_data_latest ON user_mutable_data (user_id, user_change_id DESC);

-- ============================================================
-- Functions
-- ============================================================

-- ID generation function (k-ordered, 63-bit, with 42-bit ms timestamp and 21-bit random)
CREATE OR REPLACE FUNCTION generate_id() RETURNS bigint AS $$
DECLARE
  ts bigint;
  rand bigint;
BEGIN
  ts := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint & x'3ffffffffff'::bigint;
  rand := floor(random() * 2097152)::bigint; -- 2^21
  RETURN (ts << 21) | rand;
END;
$$ LANGUAGE plpgsql;

-- Function to extract timestamp from ID
CREATE OR REPLACE FUNCTION date_from_id(id bigint) RETURNS timestamptz AS $$
BEGIN
  RETURN to_timestamp((id >> 21) / 1000.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;

-- Function to generate ID from a given timestamp (for backfilling old records with correct ID ordering)
CREATE OR REPLACE FUNCTION generate_id_at(ts timestamptz) RETURNS bigint AS $$
DECLARE
  ms bigint;
  rand bigint;
BEGIN
  ms := (EXTRACT(EPOCH FROM ts) * 1000)::bigint & x'3ffffffffff'::bigint;
  rand := floor(random() * 2097152)::bigint;
  RETURN (ms << 21) | rand;
END;
$$ LANGUAGE plpgsql STRICT;

-- Deterministic version of generate_id_at this is used for range queries.
-- WHERE id >= generate_id_at('2025-01-01'::timestamptz)          -- rand = 0
--   AND id <  generate_id_at('2025-02-01'::timestamptz, true);   -- rand = max (2097151)
CREATE OR REPLACE FUNCTION generate_id_at_det(ts timestamptz, max_val boolean DEFAULT false) RETURNS bigint AS $$
DECLARE
  ms bigint;
  rand bigint;
BEGIN
  ms := (EXTRACT(EPOCH FROM ts) * 1000)::bigint & x'3ffffffffff'::bigint;
  rand := CASE WHEN max_val THEN 2097151 ELSE 0 END;
  RETURN (ms << 21) | rand;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;


-- ============================================================
-- Views
-- ============================================================

-- Users joined with their latest mutable data + derived created_at.
-- Use this anywhere a read needs name / is_banned / created_at instead of
-- repeating the JOIN LATERAL against user_mutable_data.
CREATE VIEW users_with_data AS
SELECT u.user_id,
       u.address,
       u.user_source,
       u.wallet_info,
       umd.name,
       umd.flag,
       umd.is_banned,
       date_from_id(u.user_id) AS created_at
FROM   users u
JOIN LATERAL (
    SELECT name, flag, is_banned
    FROM   user_mutable_data
    WHERE  user_id = u.user_id
    ORDER BY user_change_id DESC
    LIMIT 1
) umd ON true;
