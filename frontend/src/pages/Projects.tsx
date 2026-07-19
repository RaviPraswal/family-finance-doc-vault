import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
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
  const toast = useToastStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', budget: '', status: 'IN_PROGRESS', startDate: '', priority: 'MEDIUM' });

  useEffect(() => {
    fetchProjects();
    fetchExpenses();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await apiClient('/api/projects');
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const data = await apiClient('/api/expenses');
      setExpenses(data);
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
      toast.success('Project saved', 'Your project has been created successfully.');
      fetchProjects();
    } catch (err: any) {
      toast.error('Failed to save project', err.message || 'Could not save project. Please try again.');
    }
  };

  const [viewMode, setViewMode] = useState<'card' | 'list' | 'detailed'>('card');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when switching viewMode
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 6 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  // Select first project if none selected
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = projects.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(projects.length / itemsPerPage);

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects & Big Expenses</h1>
          <p className="text-sm text-muted-foreground">Track sinking budgets and itemized logs for your long-term projects</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Card View"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="List View"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'detailed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Detailed View"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No projects found. Add one to start tracking large expenses like a house construction or wedding!
        </div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProjects.map((project) => (
              <div key={project.id} className="bg-card p-6 rounded-lg shadow-sm border border-border relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
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
                      <h3 className="font-semibold text-base text-foreground">{project.name}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${project.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                      {project.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p>Budget: <span className="font-semibold text-foreground">₹{project.budget.toLocaleString()}</span></p>
                    <p>Start Date: <span className="font-medium text-foreground">{new Date(project.startDate).toLocaleDateString()}</span></p>
                  </div>
                </div>

                <div>
                  <button 
                    onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
                    className="w-full py-2 text-sm text-primary font-semibold border border-primary/20 rounded-md hover:bg-primary/5 transition-colors"
                  >
                    {expandedProjectId === project.id ? 'Hide Expenses' : 'View Expenses & History'}
                  </button>

                  {expandedProjectId === project.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Project Expense Log</h4>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {expenses.filter(e => e.linkedProject?.id === project.id).length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 text-center">No expenses logged for this project yet.</p>
                        ) : (
                          expenses.filter(e => e.linkedProject?.id === project.id).map((exp) => (
                            <div key={exp.id} className="flex justify-between text-xs items-center py-1.5 border-b border-border/50 last:border-0">
                              <div>
                                <span className="font-medium text-foreground">{exp.category}</span>
                                <span className="text-[10px] text-muted-foreground block">{exp.expenseDate}</span>
                              </div>
                              <span className="font-semibold text-red-500">-₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {projects.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, projects.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{projects.length}</span> results
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer"
                    >
                      <option value={6}>6 cards</option>
                      <option value={12}>12 cards</option>
                      <option value={24}>24 cards</option>
                      <option value={48}>48 cards</option>
                    </select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(idx + 1)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-border focus:z-20 ${
                            currentPage === idx + 1
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground bg-card hover:bg-muted'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* List View (Table) */
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden h-[calc(100vh-10rem)] overflow-y-auto custom-scrollbar flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-background sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Logged Expenses</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedProjects.map((project) => {
                  const totalSpent = expenses
                    .filter((e) => e.linkedProject?.id === project.id)
                    .reduce((sum, e) => sum + e.amount, 0);

                  return (
                    <tr key={project.id} className="hover:bg-background/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="h-5 w-5 text-muted-foreground mr-3" />
                          <div className="text-sm font-medium text-foreground">{project.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground text-sm">
                        ₹{project.budget.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(project.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          project.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-500' :
                          project.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {project.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          project.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {project.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-red-500 text-sm">
                        ₹{totalSpent.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {projects.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-2">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, projects.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{projects.length}</span> results
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer"
                    >
                      <option value={10}>10 entries</option>
                      <option value={20}>20 entries</option>
                      <option value={50}>50 entries</option>
                      <option value={100}>100 entries</option>
                    </select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(idx + 1)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-border focus:z-20 ${
                            currentPage === idx + 1
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground bg-card hover:bg-muted'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border bg-card hover:bg-muted disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Detailed Split-Pane View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-4 space-y-3 overflow-y-auto h-[calc(100vh-10rem)] pr-2 custom-scrollbar">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedProject?.id === project.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:bg-muted/50 bg-card'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedProject?.id === project.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{project.name}</h4>
                      <p className="text-xs text-muted-foreground">Priority: {project.priority}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    project.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {project.status === 'COMPLETED' ? 'Done' : 'Pending'}
                  </span>
                </div>
                <div className="mt-3 flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Budget:</span>
                  <span className="text-sm font-bold text-foreground">₹{project.budget.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
            {selectedProject ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="border-b border-border/50 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{selectedProject.name}</h3>
                      <p className="text-xs text-muted-foreground">Project Timeline | Start Date: {new Date(selectedProject.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Allocated Budget</span>
                      <span className="text-2xl font-bold text-primary">₹{selectedProject.budget.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                  {/* Performance Indicators */}
                  {(() => {
                    const totalSpent = expenses
                      .filter((e) => e.linkedProject?.id === selectedProject.id)
                      .reduce((sum, e) => sum + e.amount, 0);
                    const remaining = selectedProject.budget - totalSpent;
                    const burnPercent = selectedProject.budget > 0 ? (totalSpent / selectedProject.budget) * 100 : 0;

                    return (
                      <>
                        <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                          <div>
                            <span className="text-xs text-muted-foreground block">Total Disbursed</span>
                            <span className="text-base font-semibold text-foreground">₹{totalSpent.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">Remaining Budget</span>
                            <span className={`text-base font-bold ${remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ₹{remaining.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">Budget Exhaustion</span>
                            <span className={`text-base font-bold ${burnPercent <= 100 ? 'text-foreground' : 'text-red-500'}`}>
                              {burnPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Sinking Fund Burn</span>
                            <span>{burnPercent.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3">
                            <div className={`h-3 rounded-full ${burnPercent > 100 ? 'bg-red-500' : burnPercent > 80 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, burnPercent)}%` }}></div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Transaction log */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Itemized Expense Log</h4>
                    <div className="space-y-2">
                      {expenses.filter((e) => e.linkedProject?.id === selectedProject.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center bg-background/30 rounded-lg">No expenses logged against this project.</p>
                      ) : (
                        expenses
                          .filter((e) => e.linkedProject?.id === selectedProject.id)
                          .map((exp) => (
                            <div
                              key={exp.id}
                              className="flex justify-between items-center p-3 rounded-lg border border-border/30 bg-background/50 hover:bg-background/85 transition-colors"
                            >
                              <div>
                                <div className="font-semibold text-sm text-foreground">{exp.category}</div>
                                <div className="text-xs text-muted-foreground">{exp.expenseDate}</div>
                                {exp.description && <p className="text-xs text-muted-foreground italic mt-1">{exp.description}</p>}
                              </div>
                              <span className="font-bold text-sm text-red-500">
                                -₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Building className="h-12 w-12 stroke-1 mb-2 opacity-50" />
                <p className="text-sm">Select a project on the left to view timeline metrics and expense logs.</p>
              </div>
            )}
          </div>
        </div>
      )}



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
