import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Plus, Building } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  budget: number;
  startDate: string;
  endDate?: string;
  priority: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', budget: '', status: 'IN_PROGRESS', startDate: '', priority: 'MEDIUM' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await apiClient('/api/projects');
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget)
        })
      });
      setIsModalOpen(false);
      setFormData({ name: '', budget: '', status: 'IN_PROGRESS', startDate: '', priority: 'MEDIUM' });
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Projects & Big Expenses</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-card p-6 rounded-lg shadow-sm border border-border relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl ${
              project.priority === 'HIGH' ? 'bg-red-500/20 text-red-500' :
              project.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-500' :
              'bg-blue-500/20 text-blue-500'
            }`}>
              {project.priority || 'MEDIUM'}
            </div>

            <div className="flex justify-between items-start mb-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Building className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">{project.name}</h3>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'}`}>
                {project.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
              </span>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <p>Budget: <span className="font-medium text-foreground">₹{project.budget.toLocaleString()}</span></p>
              <p>Start Date: {new Date(project.startDate).toLocaleDateString()}</p>
            </div>
            <button className="w-full py-2 text-sm text-primary font-medium border border-primary/20 rounded-md hover:bg-primary/10 transition-colors">
              View Expenses & Documents
            </button>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No projects found. Add one to start tracking large expenses like a house construction or wedding!
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name (e.g. New House, Shaadi)</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Budget (₹)</label>
                <input required type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select required value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Save Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
