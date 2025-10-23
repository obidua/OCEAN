import { TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const earningsData = [
  { date: 'Oct 1', amount: 25 },
  { date: 'Oct 5', amount: 45 },
  { date: 'Oct 10', amount: 65 },
  { date: 'Oct 15', amount: 82 },
  { date: 'Oct 20', amount: 98 },
  { date: 'Oct 25', amount: 125 },
  { date: 'Oct 30', amount: 145 },
];

const teamGrowthData = [
  { month: 'Jul', members: 2 },
  { month: 'Aug', members: 5 },
  { month: 'Sep', members: 12 },
  { month: 'Oct', members: 18 },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Analytics & Performance
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1">Track your portfolio performance and team growth</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg">
              <DollarSign className="text-cyan-400" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">$2,250</p>
          <p className="text-xs text-neon-green mt-1">↑ 12% this month</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg">
              <TrendingUp className="text-neon-green" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Avg Daily</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">$28.50</p>
          <p className="text-xs text-cyan-300/90 mt-1">0.38% rate</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-orange/30 rounded-lg">
              <Users className="text-neon-orange" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Team Size</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">18</p>
          <p className="text-xs text-neon-green mt-1">↑ 6 this month</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-purple/30 rounded-lg">
              <Award className="text-neon-purple" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Total Rewards</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">$850</p>
          <p className="text-xs text-cyan-300/90 mt-1">Passive income</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Earnings Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.1)" />
              <XAxis dataKey="date" stroke="#22d3ee" fontSize={12} />
              <YAxis stroke="#22d3ee" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(0,240,255,0.3)',
                  borderRadius: '8px',
                  color: '#22d3ee',
                  backdropFilter: 'blur(10px)',
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="url(#colorGradient)"
                strokeWidth={3}
                dot={{ fill: '#00f0ff', r: 4, strokeWidth: 2, stroke: '#39ff14' }}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="100%" stopColor="#39ff14" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Team Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.1)" />
              <XAxis dataKey="month" stroke="#22d3ee" fontSize={12} />
              <YAxis stroke="#22d3ee" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(0,240,255,0.3)',
                  borderRadius: '8px',
                  color: '#22d3ee',
                  backdropFilter: 'blur(10px)',
                }}
              />
              <Bar dataKey="members" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="100%" stopColor="#39ff14" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Income Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-cyan-300/90">Portfolio Growth</span>
                <span className="text-sm font-bold text-cyan-300">$1,400</span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-neon-green rounded-full" style={{ width: '62%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-cyan-300/90">Slab Income</span>
                <span className="text-sm font-bold text-neon-green">$450</span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-neon-green rounded-full" style={{ width: '20%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-cyan-300/90">Royalties</span>
                <span className="text-sm font-bold text-neon-orange">$240</span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-neon-orange rounded-full shadow-neon-orange" style={{ width: '11%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-cyan-300/90">Rewards</span>
                <span className="text-sm font-bold text-neon-purple">$160</span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-neon-purple rounded-full shadow-neon-purple" style={{ width: '7%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Performance Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Portfolio Progress</span>
              <span className="text-lg font-bold text-neon-green">30%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Days Active</span>
              <span className="text-lg font-bold text-cyan-300">79</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Avg Team Depth</span>
              <span className="text-lg font-bold text-neon-orange">3.2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Claims Made</span>
              <span className="text-lg font-bold text-neon-purple">12</span>
            </div>
          </div>
        </div>

        <div className="cyber-glass border border-neon-green/50 rounded-xl p-6 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
          <h3 className="font-semibold mb-4 relative z-10 uppercase tracking-wide">Projected Earnings</h3>
          <div className="space-y-3 relative z-10">
            <div>
              <p className="text-sm opacity-90 mb-1">Next 30 Days</p>
              <p className="text-2xl font-bold">$855</p>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Next 90 Days</p>
              <p className="text-2xl font-bold">$2,565</p>
            </div>
            <div className="pt-3 border-t border-white/20">
              <p className="text-xs opacity-75 mb-1">Based on current rate</p>
              <p className="text-sm">0.38% daily average</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
