-- KnowYourFam MVP — PostgreSQL relational family graph
-- Migration V1. Assumes PostgreSQL 14+ and an empty schema.
-- Family Unit is a VIEW/graph projection, not a separate source of truth in MVP.
-- Run through a migration manager (e.g. Flyway); do not rerun manually.

CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text NOT NULL,
    password_hash   text NOT NULL,
    display_name    varchar(120) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_users_email_nonempty CHECK (length(btrim(email)) >= 3)
);
CREATE UNIQUE INDEX ux_users_email_ci ON users (lower(email));

CREATE TABLE family_trees (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            varchar(120) NOT NULL,
    owner_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    archived_at     timestamptz,
    CONSTRAINT chk_family_trees_name CHECK (length(btrim(name)) > 0)
);
CREATE INDEX ix_family_trees_owner ON family_trees(owner_user_id);

CREATE TABLE persons (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id         uuid NOT NULL REFERENCES family_trees(id) ON DELETE RESTRICT,
    full_name       varchar(150) NOT NULL,
    nickname        varchar(100),
    gender          varchar(12) NOT NULL DEFAULT 'unknown',
    birth_date      date,
    death_date      date,
    birth_place     varchar(150),
    residence       varchar(150),
    occupation      varchar(150),
    notes           text,
    photo_url       text,
    created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    CONSTRAINT uq_person_tree_id UNIQUE (tree_id, id),
    CONSTRAINT chk_person_name CHECK (length(btrim(full_name)) > 0),
    CONSTRAINT chk_person_gender CHECK (gender IN ('male','female','other','unknown')),
    CONSTRAINT chk_person_dates CHECK (birth_date IS NULL OR death_date IS NULL OR death_date >= birth_date)
);
CREATE INDEX ix_persons_active_tree ON persons(tree_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_persons_tree_name ON persons(tree_id,lower(full_name)) WHERE deleted_at IS NULL;

CREATE TABLE tree_members (
    tree_id          uuid NOT NULL REFERENCES family_trees(id) ON DELETE RESTRICT,
    user_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role             varchar(12) NOT NULL DEFAULT 'viewer',
    self_person_id   uuid,
    joined_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tree_id, user_id),
    CONSTRAINT chk_tree_members_role CHECK (role IN ('owner','editor','viewer')),
    CONSTRAINT fk_tree_members_self_person FOREIGN KEY (tree_id, self_person_id)
        REFERENCES persons(tree_id,id) ON DELETE RESTRICT
);
CREATE INDEX ix_tree_members_by_user ON tree_members(user_id, tree_id);

-- A parent-child connection is directed: parent -> child.
-- A person's parents are independent of that person's partner's parents.
CREATE TABLE parent_child_relations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id             uuid NOT NULL REFERENCES family_trees(id) ON DELETE RESTRICT,
    parent_person_id    uuid NOT NULL,
    child_person_id     uuid NOT NULL,
    relation_type       varchar(20) NOT NULL DEFAULT 'unspecified',
    created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    deleted_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    CONSTRAINT fk_parent_person FOREIGN KEY (tree_id, parent_person_id)
        REFERENCES persons(tree_id,id) ON DELETE RESTRICT,
    CONSTRAINT fk_child_person FOREIGN KEY (tree_id, child_person_id)
        REFERENCES persons(tree_id,id) ON DELETE RESTRICT,
    CONSTRAINT chk_parent_child_distinct CHECK (parent_person_id <> child_person_id),
    CONSTRAINT chk_parent_type CHECK (relation_type IN ('unspecified','biological','adoptive','step','guardian'))
);
CREATE UNIQUE INDEX ux_parent_child_active ON parent_child_relations(tree_id,parent_person_id,child_person_id)
    WHERE deleted_at IS NULL;
CREATE INDEX ix_parent_to_children ON parent_child_relations(tree_id,parent_person_id)
    WHERE deleted_at IS NULL;
CREATE INDEX ix_child_to_parents ON parent_child_relations(tree_id,child_person_id)
    WHERE deleted_at IS NULL;

-- Keep unordered pairs in canonical order: person_a_id < person_b_id.
-- Having a child together never creates a partner relation automatically.
CREATE TABLE partner_relations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id             uuid NOT NULL REFERENCES family_trees(id) ON DELETE RESTRICT,
    person_a_id         uuid NOT NULL,
    person_b_id         uuid NOT NULL,
    relation_type       varchar(20) NOT NULL DEFAULT 'partner',
    started_on          date,
    ended_on            date,
    created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    deleted_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    CONSTRAINT fk_partner_a FOREIGN KEY (tree_id,person_a_id)
        REFERENCES persons(tree_id,id) ON DELETE RESTRICT,
    CONSTRAINT fk_partner_b FOREIGN KEY (tree_id,person_b_id)
        REFERENCES persons(tree_id,id) ON DELETE RESTRICT,
    CONSTRAINT chk_partner_order CHECK (person_a_id < person_b_id),
    CONSTRAINT chk_partner_type CHECK (relation_type IN ('partner','married','former_partner','unknown')),
    CONSTRAINT chk_partner_dates CHECK (started_on IS NULL OR ended_on IS NULL OR ended_on >= started_on)
);
CREATE UNIQUE INDEX ux_partner_active ON partner_relations(tree_id,person_a_id,person_b_id)
    WHERE deleted_at IS NULL;
CREATE INDEX ix_partner_a ON partner_relations(tree_id,person_a_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_partner_b ON partner_relations(tree_id,person_b_id) WHERE deleted_at IS NULL;

-- Store an explicit sibling statement only when needed.
-- Siblings who share a known parent are derived in queries, not duplicated here.
CREATE TABLE sibling_relations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id             uuid NOT NULL REFERENCES family_trees(id) ON DELETE RESTRICT,
    person_a_id         uuid NOT NULL,
    person_b_id         uuid NOT NULL,
    relation_type       varchar(20) NOT NULL DEFAULT 'unspecified',
    created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    deleted_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    CONSTRAINT fk_sibling_a FOREIGN KEY (tree_id,person_a_id)
        REFERENCES persons(tree_id,id) ON DELETE RESTRICT,
    CONSTRAINT fk_sibling_b FOREIGN KEY (tree_id,person_b_id)
        REFERENCES persons(tree_id,id) ON DELETE RESTRICT,
    CONSTRAINT chk_sibling_order CHECK (person_a_id < person_b_id),
    CONSTRAINT chk_sibling_type CHECK (relation_type IN ('unspecified','full','half','step','adoptive'))
);
CREATE UNIQUE INDEX ux_sibling_active ON sibling_relations(tree_id,person_a_id,person_b_id)
    WHERE deleted_at IS NULL;
CREATE INDEX ix_sibling_a ON sibling_relations(tree_id,person_a_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_sibling_b ON sibling_relations(tree_id,person_b_id) WHERE deleted_at IS NULL;

-- Pure view preferences, never the canonical relationship data.
-- Example expanded_branches: ["origin:<uuid>", "family:<uuid>"].
CREATE TABLE tree_view_states (
    tree_id             uuid NOT NULL,
    user_id             uuid NOT NULL,
    focus_person_id     uuid,
    mode                varchar(12) NOT NULL DEFAULT 'focus',
    expanded_branches   jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at          timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tree_id,user_id),
    CONSTRAINT fk_view_membership FOREIGN KEY (tree_id,user_id)
        REFERENCES tree_members(tree_id,user_id) ON DELETE CASCADE,
    CONSTRAINT fk_view_focus_person FOREIGN KEY (tree_id,focus_person_id)
        REFERENCES persons(tree_id,id) ON DELETE RESTRICT,
    CONSTRAINT chk_tree_view_mode CHECK (mode IN ('focus','overview')),
    CONSTRAINT chk_tree_view_expanded_array CHECK (jsonb_typeof(expanded_branches) = 'array')
);

-- Integrity rules enforced by the Spring Boot service inside a tree-scoped transaction:
-- 1. Lock family_trees row (SELECT ... FOR UPDATE) before modifying parent edges.
-- 2. Reject parent-child cycles using a recursive CTE from proposed child to proposed parent.
-- 3. Never infer a marriage/partnership merely from a shared child.
-- 4. Reject references to soft-deleted persons and unauthorized tree edits.
-- 5. Soft-delete a relationship (set deleted_at, deleted_by), do not delete its two persons.
-- 6. For partner/sibling inserts sort UUIDs before saving.
-- 7. 'self_person_id' is per user / per tree, not a global person property.
