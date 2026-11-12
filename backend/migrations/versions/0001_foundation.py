"""Initial academic foundation. Frozen PostgreSQL DDL, independent of live models."""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TABLE courses (\n\tid UUID NOT NULL, \n\ttitle VARCHAR(200) NOT NULL, \n\tslug VARCHAR(220) NOT NULL, \n\tdescription TEXT NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tCHECK (status IN ('draft','published','archived')), \n\tUNIQUE (slug)\n)")
    op.execute('CREATE TABLE users (\n\tid UUID NOT NULL, \n\tauth_issuer VARCHAR(500) NOT NULL, \n\tauth_subject VARCHAR(255) NOT NULL, \n\tdisplay_name VARCHAR(150) NOT NULL, \n\tactive BOOLEAN NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (auth_issuer, auth_subject)\n)')
    op.execute('CREATE TABLE audit_logs (\n\tid UUID NOT NULL, \n\tactor_id UUID NOT NULL, \n\taction VARCHAR(100) NOT NULL, \n\tresource_id UUID NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(actor_id) REFERENCES users (id)\n)')
    op.execute('CREATE TABLE cohorts (\n\tid UUID NOT NULL, \n\tcourse_id UUID NOT NULL, \n\ttitle VARCHAR(200) NOT NULL, \n\tPRIMARY KEY (id), \n\tFOREIGN KEY(course_id) REFERENCES courses (id)\n)')
    op.execute('CREATE TABLE modules (\n\tid UUID NOT NULL, \n\tcourse_id UUID NOT NULL, \n\ttitle VARCHAR(200) NOT NULL, \n\tposition INTEGER NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (course_id, position), \n\tCHECK (position > 0), \n\tFOREIGN KEY(course_id) REFERENCES courses (id)\n)')
    op.execute("CREATE TABLE user_roles (\n\tuser_id UUID NOT NULL, \n\trole VARCHAR(20) NOT NULL, \n\tPRIMARY KEY (user_id, role), \n\tCHECK (role IN ('admin','teacher','student')), \n\tFOREIGN KEY(user_id) REFERENCES users (id)\n)")
    op.execute('CREATE TABLE cohort_teachers (\n\tcohort_id UUID NOT NULL, \n\tteacher_id UUID NOT NULL, \n\tPRIMARY KEY (cohort_id, teacher_id), \n\tFOREIGN KEY(cohort_id) REFERENCES cohorts (id), \n\tFOREIGN KEY(teacher_id) REFERENCES users (id)\n)')
    op.execute("CREATE TABLE enrollments (\n\tid UUID NOT NULL, \n\tcohort_id UUID NOT NULL, \n\tstudent_id UUID NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (cohort_id, student_id), \n\tCHECK (status IN ('requested','active','cancelled','completed')), \n\tFOREIGN KEY(cohort_id) REFERENCES cohorts (id), \n\tFOREIGN KEY(student_id) REFERENCES users (id)\n)")
    op.execute('CREATE TABLE units (\n\tid UUID NOT NULL, \n\tmodule_id UUID NOT NULL, \n\ttitle VARCHAR(200) NOT NULL, \n\tposition INTEGER NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (module_id, position), \n\tCHECK (position > 0), \n\tFOREIGN KEY(module_id) REFERENCES modules (id)\n)')
    op.execute('CREATE TABLE lessons (\n\tid UUID NOT NULL, \n\tunit_id UUID NOT NULL, \n\ttitle VARCHAR(200) NOT NULL, \n\tdescription TEXT NOT NULL, \n\tposition INTEGER NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (unit_id, position), \n\tCHECK (position > 0), \n\tFOREIGN KEY(unit_id) REFERENCES units (id)\n)')
    op.execute('CREATE INDEX ix_audit_logs_actor_id ON audit_logs (actor_id)')
    op.execute('CREATE INDEX ix_cohorts_course_id ON cohorts (course_id)')
    op.execute('CREATE INDEX ix_modules_course_id ON modules (course_id)')
    op.execute('CREATE INDEX ix_enrollments_cohort_id ON enrollments (cohort_id)')
    op.execute('CREATE INDEX ix_enrollments_student_status ON enrollments (student_id, status)')
    op.execute('CREATE INDEX ix_units_module_id ON units (module_id)')
    op.execute('CREATE INDEX ix_lessons_unit_id ON lessons (unit_id)')


def downgrade() -> None:
    op.execute('DROP TABLE lessons')
    op.execute('DROP TABLE units')
    op.execute('DROP TABLE enrollments')
    op.execute('DROP TABLE cohort_teachers')
    op.execute('DROP TABLE user_roles')
    op.execute('DROP TABLE modules')
    op.execute('DROP TABLE cohorts')
    op.execute('DROP TABLE audit_logs')
    op.execute('DROP TABLE users')
    op.execute('DROP TABLE courses')
