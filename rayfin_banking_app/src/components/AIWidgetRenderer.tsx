import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { AIChartDatum, AIWidget } from '@/types/aiModule';

interface AIWidgetRendererProps {
  widget: AIWidget;
  data?: AIChartDatum[];
}

function formatValue(value: number | string): string {
  if (typeof value === 'number') {
    return `$${Math.round(value).toLocaleString()}`;
  }
  return String(value);
}

function truncateLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 12)}...` : label;
}

export function AIWidgetRenderer({ widget, data }: AIWidgetRendererProps) {
  const chartData = data ?? widget.config.customProps?.data ?? [];
  const chartType = widget.config.chartType;
  const xAxisKey = widget.config.xAxis ?? 'name';
  const colors = widget.config.colors ?? ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b'];
  const valueKeys = Object.keys(chartData[0] ?? {}).filter(
    (key) => key !== xAxisKey && typeof chartData[0]?.[key] === 'number'
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        No data available yet.
      </div>
    );
  }

  if (chartType === 'pie') {
    const yAxisKey = widget.config.yAxis ?? 'value';

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
          <Pie
            data={chartData}
            dataKey={yAxisKey}
            nameKey={xAxisKey}
            innerRadius="48%"
            outerRadius="72%"
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`${entry[xAxisKey]}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatValue(value)} />
          <Legend
            verticalAlign="bottom"
            formatter={(value) => truncateLabel(String(value))}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const sharedProps = {
    data: chartData,
    margin: { top: 8, right: 8, bottom: 8, left: 0 },
  };

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...sharedProps}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} tickFormatter={truncateLabel} fontSize={12} />
          <YAxis width={72} tickFormatter={formatValue} fontSize={12} />
          <Tooltip formatter={(value) => formatValue(value)} />
          <Legend />
          {valueKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...sharedProps}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} tickFormatter={truncateLabel} fontSize={12} />
          <YAxis width={72} tickFormatter={formatValue} fontSize={12} />
          <Tooltip formatter={(value) => formatValue(value)} />
          <Legend />
          {valueKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart {...sharedProps}>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} tickFormatter={truncateLabel} fontSize={12} />
        <YAxis width={72} tickFormatter={formatValue} fontSize={12} />
        <Tooltip formatter={(value) => formatValue(value)} />
        <Legend />
        {valueKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            radius={[8, 8, 0, 0]}
            maxBarSize={42}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
