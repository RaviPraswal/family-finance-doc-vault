import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { Users, UserPlus, Trash, Sparkles, Building } from 'lucide-react';

interface MemberInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  isAdmin: boolean;
}

export default function Register() {
  const [familyName, setFamilyName] = useState('');
  const [address, setAddress] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [members, setMembers] = useState<MemberInput[]>([
    { name: '', email: '', password: '', phone: '', isAdmin: true } // First user is Admin by default
  ]);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((state) => state.setToken);
  const navigate = useNavigate();

  const handleMemberChange = (index: number, field: keyof MemberInput, value: any) => {
    const updated = [...members];
    if (field === 'isAdmin') {
      // Ensure only one member is Admin, or set the current one to true and others to false
      updated.forEach((m, idx) => {
        m.isAdmin = idx === index ? value : false;
      });
    } else {
      (updated[index] as any)[field] = value;
    }
    setMembers(updated);
  };

  const addMember = () => {
    setMembers([...members, { name: '', email: '', password: '', phone: '', isAdmin: false }]);
  };

  const removeMember = (index: number) => {
    if (members[index].isAdmin) {
      // If we remove the admin, nominate the first remaining member
      const updated = members.filter((_, idx) => idx !== index);
      if (updated.length > 0) {
        updated[0].isAdmin = true;
      }
      setMembers(updated);
    } else {
      setMembers(members.filter((_, idx) => idx !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (!familyName || !address) {
      setError('Please fill in all family details.');
      return;
    }
    
    const invalidMember = members.find(m => !m.name || !m.email || !m.password);
    if (invalidMember) {
      setError('Please fill in Name, Email, and Password for all members.');
      return;
    }

    const hasAdmin = members.some(m => m.isAdmin);
    if (!hasAdmin) {
      setError('Please select at least one Admin for the family.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          familyName,
          address,
          phone: familyPhone,
          members
        }),
      });
      setToken(response.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
      <div className="w-full max-w-4xl glass-panel text-foreground rounded-3xl shadow-2xl border border-border p-8 md:p-12 space-y-8 bg-card/90">
        
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            FinNest Family Registration
          </h2>
          <p className="text-sm text-muted-foreground">Register your entire family profile and secure all documents under one roof.</p>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Family Basic Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 text-primary">
              <Building className="h-5 w-5" /> Family Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Family/Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma Family"
                  className="w-full p-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Family Contact Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  className="w-full p-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                  value={familyPhone}
                  onChange={(e) => setFamilyPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Family Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Delhi, India"
                  className="w-full p-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Family Members */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" /> Family Members ({members.length})
              </h3>
              <button
                type="button"
                onClick={addMember}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-all"
              >
                <UserPlus className="h-4 w-4" /> Add Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {members.map((member, index) => (
                <div 
                  key={index}
                  className={`p-6 rounded-2xl border transition-all ${member.isAdmin ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-muted/20'}`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-muted-foreground uppercase">Member #{index + 1}</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="admin-select"
                            checked={member.isAdmin}
                            onChange={() => handleMemberChange(index, 'isAdmin', true)}
                            className="text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-xs font-bold text-foreground flex items-center gap-1">
                            👑 Is Family Admin
                          </span>
                        </label>
                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMember(index)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
                            title="Remove member"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Name"
                          className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
                          value={member.name}
                          onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Phone</label>
                        <input
                          type="text"
                          placeholder="Phone"
                          className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
                          value={member.phone}
                          onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Email</label>
                        <input
                          type="email"
                          required
                          placeholder="Email"
                          className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
                          value={member.email}
                          onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="Password"
                          className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
                          value={member.password}
                          onChange={(e) => handleMemberChange(index, 'password', e.target.value)}
                        />
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
            </p>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-extrabold rounded-xl hover:bg-primary/95 transition-all shadow-md hover:shadow-lg disabled:opacity-50 min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Registering...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Register Family
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// Simple loader helper inside the file for self-containment
const Loader2 = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
