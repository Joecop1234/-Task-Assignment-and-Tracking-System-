import React, { useState, useEffect } from 'react';
import {
  Download, RefreshCw, Users, BarChart3,
  Loader2, AlertCircle, ExternalLink
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { apiClient } from '../configApi';

// ============================================================
// Reports Service
// ============================================================
class ReportsService {
  static async getWeeklyWorkload(filters = {}) {
    const params = new URLSearchParams();
    if (filters.week) params.append('week', filters.week);
    if (filters.period) params.append('period', filters.period);
    const query = params.toString();
    const response = await apiClient.get(`/reports/workload${query ? `?${query}` : ''}`);
    return response.data;
  }

  static async getTeamPerformance(filters = {}) {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.department) params.append('department', filters.department);
    const query = params.toString();
    const response = await apiClient.get(`/reports/team-performance${query ? `?${query}` : ''}`);
    return response.data;
  }

  static async exportReport(type, filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const query = params.toString();
    const response = await apiClient.get(`/reports/export/${type}${query ? `?${query}` : ''}`, {
      responseType: 'blob',
      timeout: 30000
    });
    return response;
  }
}

// ============================================================
// Progress Bar
// ============================================================
const ProgressBar = ({ value, color, label }) => (
  <div className="flex-1">
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{value}%</span>
    </div>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

// ============================================================
// ReportsPage
// ============================================================
function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [weeklyWorkloadData, setWeeklyWorkloadData] = useState([]);
  const [teamPerformanceData, setTeamPerformanceData] = useState([]);

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedDepartment]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        period: selectedPeriod,
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined
      };

      const results = await Promise.allSettled([
        ReportsService.getWeeklyWorkload(filters),
        ReportsService.getTeamPerformance(filters)
      ]);

      if (results[0].status === 'fulfilled' && results[0].value.success) {
        setWeeklyWorkloadData(results[0].value.data);
      }
      if (results[1].status === 'fulfilled' && results[1].value.success) {
        setTeamPerformanceData(results[1].value.data);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const filters = {
        period: selectedPeriod,
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined
      };
      const response = await ReportsService.exportReport('pdf', filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tats-report-${Date.now()}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Please try again.');
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Avatar colors
  const avatarColors = [
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Real-time insights and performance metrics</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="thisQuarter">This Quarter</option>
                <option value="thisYear">This Year</option>
              </select>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleExport}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* 2 Columns: Weekly Workload + Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Weekly Workload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Workload</h3>
              <p className="text-sm text-gray-500 mt-1">Team capacity utilization</p>
            </div>
            <div className="h-72">
              {weeklyWorkloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyWorkloadData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`${value}%`, 'Workload']}
                    />
                    <Bar dataKey="workload" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <BarChart3 className="w-12 h-12 mb-2" />
                  <p className="text-sm">No workload data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                <p className="text-sm text-gray-500 mt-1">Team members with highest productivity</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                View All <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-5">
              {teamPerformanceData.length > 0 ? teamPerformanceData.slice(0, 5).map((member, index) => (
                <div key={index} className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-10 h-10 bg-gradient-to-br ${avatarColors[index % avatarColors.length]} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-bold">
                      {member.name ? member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </span>
                  </div>

                  {/* Name + tasks */}
                  <div className="flex-shrink-0 w-32">
                    <p className="font-semibold text-gray-900 text-sm truncate">{member.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{member.tasksCompleted || 0} tasks completed</p>
                  </div>

                  {/* Efficiency + Workload */}
                  <div className="flex-1 flex items-center gap-4">
                    <ProgressBar
                      value={member.efficiency || 0}
                      color={
                        (member.efficiency || 0) >= 80 ? 'bg-green-500' :
                        (member.efficiency || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }
                      label="Efficiency"
                    />
                    <ProgressBar
                      value={member.workload || 0}
                      color={
                        (member.workload || 0) >= 85 ? 'bg-red-500' :
                        (member.workload || 0) >= 70 ? 'bg-orange-500' : 'bg-blue-500'
                      }
                      label="Workload"
                    />
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center text-gray-400 py-12">
                  <Users className="w-12 h-12 mb-2" />
                  <p className="text-sm">No team performance data available</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ReportsPage;