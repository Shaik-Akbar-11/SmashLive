const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/** Trim + lowercase — mirrors backend normalizeEmail */
const normalizeEmail = (email: string): string =>
  String(email).trim().toLowerCase();

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  gender?: string;
  state?: string;
  district?: string;
  role: string;
  smashId?: string;
  onboardingComplete: boolean;
  token: string;
}

export const AuthService = {
  normalizeEmail,

  /** POST /api/auth/send-otp */
  async sendOtp(email: string): Promise<void> {
    const res = await fetch(`${API_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Unable to send OTP. Please try again.');
  },

  /** POST /api/auth/register — verifies OTP then creates account */
  async registerAthlete(profileData: {
    name: string;
    gender: string;
    state: string;
    district: string;
    email: string;
    otp: string;
  }): Promise<UserProfile> {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profileData,
        email: normalizeEmail(profileData.email),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    return data as UserProfile;
  },

  /** POST /api/auth/login — verifies OTP then returns profile + JWT */
  async loginWithOtp(email: string, otp: string): Promise<UserProfile> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeEmail(email), otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data as UserProfile;
  },

  async getProfile(): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateProfile(data: object): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Update failed');
    return json;
  },

  setLocalSession(profile: UserProfile) {
    if (!profile) return;
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('authToken', profile.token);
    localStorage.setItem('userProfile', JSON.stringify(profile));
    window.dispatchEvent(new Event('storage'));
  },

  logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userProfile');
    window.dispatchEvent(new Event('storage'));
  },

  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  isLoggedIn(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true';
  },
};
