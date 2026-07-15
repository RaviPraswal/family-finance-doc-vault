import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { Users, UserPlus, Shield, User, Mail, Phone, Trash2, Home, MapPin, Sparkles, X } from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface FamilyProfile {
  familyName: string;
  address?: string;
  phone?: string;
}

export default function FamilyMembers() {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'OWNER';

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Add Member Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MEMBER');

  const fetchMembers = async () => {
    try {
      const data = await apiClient('/api/family-members');
      // Filter out profile request endpoint if it somehow sneaks into members (it won't, but list is list)
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await apiClient('/api/family-members/profile');
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch family profile', err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchProfile();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient('/api/family-members', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password, role })
      });
      
      // Reset
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRole('MEMBER');
      setIsAddOpen(false);
      
      fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (member: FamilyMember) => {
    const newRole = member.role === 'OWNER' ? 'MEMBER' : 'OWNER';
    if (!window.confirm(`Are you sure you want to change ${member.name}'s role to ${newRole}?`)) return;

    try {
      await apiClient(`/api/family-members/${member.id}/role?role=${newRole}`, {
        method: 'PUT'
      });
      fetchMembers();
    } catch (err) {
      console.error('Failed to change role', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the family?`)) return;

    try {
      await apiClient(`/api/family-members/${id}`, {
        method: 'DELETE'
      });
      fetchMembers();
    } catch (err) {
      console.error('Failed to delete member', err);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            <Users className="h-8 w-8 text-primary shrink-0" />
            Family Member Management
          </h1>
          <p className="text-sm text-muted-foreground">Manage profile, contacts, and roles for the family group.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary/95 transition-all shadow-md hover:shadow-lg text-xs"
          >
            <UserPlus className="h-4 w-4" />
            Add Family Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Family Metadata Profile Card */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="glass-panel p-6 rounded-2xl space-y-6 bg-card/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none"></div>
            
            <h3 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-3 text-primary">
              <Home className="h-5 w-5" /> Family Info
            </h3>

            {profile ? (
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">Family Name</span>
                  <p className="font-semibold text-base text-foreground mt-0.5">{profile.familyName}</p>
                </div>
                
                {profile.address && (
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Address
                    </span>
                    <p className="text-foreground mt-1 leading-relaxed">{profile.address}</p>
                  </div>
                )}

                {profile.phone && (
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> Contact Number
                    </span>
                    <p className="text-foreground mt-1">{profile.phone}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Loading family details...</p>
            )}

            <div className="pt-4 border-t border-border/80 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Co-members share documents and finances with the family Admin.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Members Grid List */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="glass-panel p-6 rounded-2xl bg-card/65 space-y-4">
            <h3 className="text-lg font-bold">Family Members ({members.length})</h3>

            <div className="divide-y divide-border overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Role</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4 px-4 font-semibold text-foreground flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {member.name} {member.id === currentUser?.id && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">You</span>}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" /> {member.email}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {member.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> {member.phone}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-4 px-4">
                        {member.role === 'OWNER' ? (
                          <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit border border-primary/20">
                            <Shield className="h-3.5 w-3.5" /> Admin
                          </span>
                        ) : (
                          <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit border border-border">
                            <User className="h-3.5 w-3.5" /> Member
                          </span>
                        )}
                      </td>
                      
                      {isAdmin && (
                        <td className="py-4 px-4 text-right">
                          {member.id !== currentUser?.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => toggleRole(member)}
                                className="text-xs bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                              >
                                {member.role === 'OWNER' ? 'Make Member' : 'Make Admin'}
                              </button>
                              <button
                                onClick={() => handleDelete(member.id, member.name)}
                                className="text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive p-1.5 rounded-lg transition-colors"
                                title="Remove member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>

      {/* Add Family Member Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 relative">
            
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Add Family Member
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Create a login profile for a new member of your family vault.</p>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl mb-4 text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Member Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. priya@sharma.com"
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43212"
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Role/Privilege</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                  >
                    <option value="MEMBER">Member (Self Data)</option>
                    <option value="OWNER">Admin (See Everything)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/95 text-sm transition-all shadow-md mt-6"
              >
                {loading ? 'Adding Member...' : 'Create Member Account'}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
