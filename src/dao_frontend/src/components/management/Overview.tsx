import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';

import { useProposals } from '../../hooks/useProposals';
import { useStaking } from '../../hooks/useStaking';
import { useTreasury } from '../../hooks/useTreasury';
import { useGovernance } from '../../hooks/useGovernance';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 

  Activity,
  Vote,
  Coins,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Target,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { DAO } from '../../types/dao';
import { useActors } from '../../context/ActorContext';
import { useAuth } from '../../context/AuthContext';
import { Principal } from '@dfinity/principal';
import type { Activity as ActivityRecord } from '@declarations/dao_backend/dao_backend.did';

const Overview: React.FC = () => {
  const { dao } = useOutletContext<{ dao: DAO }>();
  const { daoBackend } = useActors();
  const { principal } = useAuth();
  const { createProposal } = useProposals();
  const { stake, getUserStakingSummary, getStakingStats } = useStaking();
  const { getBalance, getTreasuryStats } = useTreasury();
  const { getGovernanceStats } = useGovernance();
  const navigate = useNavigate();

  const [recentActivity, setRecentActivity] = useState<ActivityRecord[]>([]);
  const [dynamicStats, setDynamicStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDynamicData = async () => {
    try {
      const [govStats, stakingStats, treasuryStats, userStaking] = await Promise.all([
        getGovernanceStats(),
        getStakingStats(),
        getTreasuryStats(),
        principal ? getUserStakingSummary(principal) : null
      ]);

      setDynamicStats({
        governance: govStats,
        staking: stakingStats,
        treasury: treasuryStats,
        userStaking
      });
    } catch (err) {
      console.error('Failed to fetch dynamic stats', err);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          (async () => {
            const activity = await daoBackend.getRecentActivity();
            setRecentActivity(activity || []);
          })(),
          fetchDynamicData()
        ]);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };

    if (daoBackend) {
      fetchData();
    }
  }, [daoBackend, principal]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDynamicData();
    } catch (err) {
      console.error('Failed to refresh data', err);
    } finally {
      setRefreshing(false);
    }
  };

  const quickStats = React.useMemo(() => [
    {
      label: 'Total Members',
      value: dao.memberCount.toLocaleString(),
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: 'blue'
    },
    {
      label: 'Treasury Balance',
      value: dynamicStats?.treasury ? `$${Number(dynamicStats.treasury.balance.total).toLocaleString()}` : dao.treasury.balance,
      change: dynamicStats?.treasury ? `+$${Number(dynamicStats.treasury.totalDeposits).toLocaleString()}` : dao.treasury.monthlyInflow,
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Total Staked',
      value: dynamicStats?.staking ? `$${Number(dynamicStats.staking.totalStakedAmount).toLocaleString()}` : dao.staking.totalStaked,
      change: '+8.2%',
      trend: 'up',
      icon: Coins,
      color: 'purple'
    },
    {
      label: 'Active Proposals',
      value: dynamicStats?.governance ? Number(dynamicStats.governance.activeProposals).toString() : dao.governance.activeProposals.toString(),
      change: '+2',
      trend: 'up',
      icon: Vote,
      color: 'orange'
    }
  ], [dao, dynamicStats]);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'border-blue-500/30 text-blue-400';
      case 'green':
        return 'border-green-500/30 text-green-400';
      case 'purple':
        return 'border-purple-500/30 text-purple-400';
      case 'orange':
        return 'border-orange-500/30 text-orange-400';
      default:
        return 'border-gray-500/30 text-gray-400';
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'proposal':
        return Vote;
      case 'staking':
        return Coins;
      case 'governance':
        return Activity;
      case 'treasury':
        return DollarSign;
      default:
        return Activity;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'proposal':
        return 'text-blue-400';
      case 'staking':
        return 'text-purple-400';
      case 'governance':
        return 'text-green-400';
      case 'treasury':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 font-mono">OVERVIEW</h2>
          <p className="text-gray-400">
            Complete overview of {dao.name} performance and activity
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-all font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </motion.button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-2 text-blue-400 font-mono">Loading overview...</span>
        </div>
      )}

      {/* Quick Stats Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className={`bg-gray-800/50 border ${getColorClasses(stat.color)} p-6 rounded-xl backdrop-blur-sm relative overflow-hidden group`}
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 ${getColorClasses(stat.color).split(' ')[1]}`} />
              <div className={`flex items-center space-x-1 text-sm ${
                stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                <span>{stat.change}</span>
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400 font-mono">{stat.label}</p>
            </div>
          </motion.div>
        ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white font-mono">RECENT ACTIVITY</h3>
              <button className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-mono">
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const ActivityIcon = getActivityIcon(activity.activityType);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start space-x-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gray-800 border border-gray-600 flex items-center justify-center ${getActivityColor(activity.activityType)}`}>
                      <ActivityIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold mb-1">{activity.title}</h4>
                      <p className="text-gray-400 text-sm mb-2">{activity.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-mono">{activity.timestamp.toString()}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.status === 'active' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* DAO Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4 font-mono">DAO INFO</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm font-mono">Category</span>
                <span className="text-white font-semibold">{dao.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm font-mono">Status</span>
                <span className="text-green-400 font-semibold capitalize">{dao.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm font-mono">Created</span>
                <span className="text-white">{dao.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm font-mono">Staking APR</span>
                <span className="text-green-400 font-bold">{dao.staking.apr}</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4 font-mono">QUICK ACTIONS</h3>
            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-between p-3 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                onClick={() => navigate(`/dao/${dao.id}/manage/proposals`)}
              >
                <span className="font-mono">Create Proposal</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                className="w-full flex items-center justify-between p-3 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                onClick={() => navigate(`/dao/${dao.id}/manage/staking`)}
              >
                <span className="font-mono">Stake Tokens</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                className="w-full flex items-center justify-between p-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                onClick={() => navigate(`/dao/${dao.id}/manage/treasury`)}
              >
                <span className="font-mono">View Treasury</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4 font-mono">PERFORMANCE</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 font-mono">Governance Participation</span>
                  <span className="text-blue-400 font-bold">
                    {dynamicStats?.governance ? 
                      Math.round((Number(dynamicStats.governance.totalVotes) / dao.memberCount) * 100) || 0 
                      : 78}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${dynamicStats?.governance ? 
                        Math.round((Number(dynamicStats.governance.totalVotes) / dao.memberCount) * 100) || 0 
                        : 78}%` 
                    }}
                    transition={{ duration: 1, delay: 0.8 }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 font-mono">Treasury Utilization</span>
                  <span className="text-green-400 font-bold">
                    {dynamicStats?.treasury ? 
                      Math.round((Number(dynamicStats.treasury.totalWithdrawals) / Number(dynamicStats.treasury.totalDeposits)) * 100) || 0 
                      : 45}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${dynamicStats?.treasury ? 
                        Math.round((Number(dynamicStats.treasury.totalWithdrawals) / Number(dynamicStats.treasury.totalDeposits)) * 100) || 0 
                        : 45}%` 
                    }}
                    transition={{ duration: 1, delay: 1 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
