/**
 * Mirror of BE AccountStatesSeedConstants / AccountStatesDataSeeder.
 * Keep in sync with:
 *   BE/src/main/java/.../config/seed/AccountStatesSeedConstants.java
 *
 * Ma trận trạng thái tài khoản (Module 5 — xác thực email + duyệt tài khoản).
 * Đây là seed ở mức tài khoản (không phải slug hackathon trong DevSeedCatalog).
 */
const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';

export const ACCOUNT_STATES_PASSWORD = process.env.E2E_ACCOUNT_PASSWORD || 'Account@dev1';

/**
 * @typedef {object} AccountStateEntry
 * @property {string} key
 * @property {string} email
 * @property {string} fullName
 * @property {'STUDENT'|'JUDGE'|'MENTOR'} role
 * @property {'PENDING'|'APPROVED'|'REJECTED'} status
 * @property {boolean} emailVerified
 * @property {string} loginErrorCode  Expected error.code khi POST /auth/login
 * @property {string} label
 */

/** @type {AccountStateEntry[]} */
export const ACCOUNT_STATES = [
  {
    key: 'unverified-student',
    email: 'account.student.unverified@fpt.edu.vn',
    fullName: 'Sinh viên Chưa xác thực',
    role: 'STUDENT',
    status: 'PENDING',
    emailVerified: false,
    loginErrorCode: 'EMAIL_NOT_VERIFIED',
    label: 'STUDENT chưa verify email → gate xác thực + gửi lại link',
  },
  {
    key: 'pending-mentor',
    email: 'account.mentor.pending@fpt.edu.vn',
    fullName: 'Mentor Chờ duyệt',
    role: 'MENTOR',
    status: 'PENDING',
    emailVerified: true,
    loginErrorCode: 'ACCOUNT_PENDING',
    label: 'MENTOR chờ duyệt → hàng chờ "Duyệt tài khoản"',
  },
  {
    key: 'pending-judge',
    email: 'account.judge.pending@fpt.edu.vn',
    fullName: 'Giám khảo Chờ duyệt',
    role: 'JUDGE',
    status: 'PENDING',
    emailVerified: true,
    loginErrorCode: 'ACCOUNT_PENDING',
    label: 'JUDGE chờ duyệt → hàng chờ "Duyệt tài khoản"',
  },
  {
    key: 'rejected-judge',
    email: 'account.judge.rejected@fpt.edu.vn',
    fullName: 'Giám khảo Bị từ chối',
    role: 'JUDGE',
    status: 'REJECTED',
    emailVerified: true,
    loginErrorCode: 'REJECTED_NOT_ALLOWED_LOGIN',
    label: 'JUDGE bị từ chối → login chặn + hiển thị lý do',
  },
  {
    key: 'approved-unverified-mentor',
    email: 'account.mentor.approved-unverified@fpt.edu.vn',
    fullName: 'Mentor Đã duyệt Chưa verify',
    role: 'MENTOR',
    status: 'APPROVED',
    emailVerified: false,
    loginErrorCode: 'EMAIL_NOT_VERIFIED',
    label: 'MENTOR đã duyệt nhưng chưa verify email → gate xác thực (không phải chờ duyệt)',
  },
];

export const ACCOUNT_STATES_BY_KEY = Object.fromEntries(
  ACCOUNT_STATES.map((a) => [a.key, a]),
);

/**
 * Probe BE: mỗi tài khoản khi login phải trả đúng error.code mong đợi.
 * @returns {Promise<{ key: string, pass: boolean, reason?: string }[]>}
 */
export async function probeAccountStates() {
  const results = [];
  for (const acc of ACCOUNT_STATES) {
    try {
      const res = await fetch(`${BE_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: ACCOUNT_STATES_PASSWORD }),
      });
      const json = await res.json().catch(() => ({}));
      const code = json?.error?.code;
      if (code === acc.loginErrorCode) {
        results.push({ key: acc.key, pass: true });
      } else if (res.ok) {
        results.push({
          key: acc.key,
          pass: false,
          reason: `expected ${acc.loginErrorCode}, but login succeeded`,
        });
      } else {
        results.push({
          key: acc.key,
          pass: false,
          reason: `expected ${acc.loginErrorCode}, got ${code || res.status}`,
        });
      }
    } catch (err) {
      results.push({ key: acc.key, pass: false, reason: err.message });
    }
  }
  return results;
}
