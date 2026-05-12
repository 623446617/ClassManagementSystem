<template>
  <div class="page-container">
    <a-row :gutter="24">
      <a-col :span="6" v-for="stat in statistics" :key="stat.key">
        <a-card class="stat-card">
          <a-statistic
            :title="stat.title"
            :value="stat.value"
            :prefix="stat.icon"
            :value-style="{ color: stat.color }"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="考勤统计">
          <div ref="attendanceChart" style="height: 300px"></div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="成绩分布">
          <div ref="gradeChart" style="height: 300px"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="待办事项">
          <a-list :data-source="todos">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta :description="item.description">
                <span slot="title">{{ item.title }}</span>
              </a-list-item-meta>
              <a-tag :color="item.color">{{ item.status }}</a-tag>
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="最近动态">
          <a-list :data-source="recentActivities">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta :description="item.created_at">
                <a-avatar slot="avatar" :icon="getActivityIcon(item.type)" />
                <span slot="title">{{ item.title }}</span>
              </a-list-item-meta>
              <span>{{ item.class_name }}</span>
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import api from '../api';

export default {
  name: 'Dashboard',
  data() {
    return {
      statistics: [
        { key: 'student', title: '学生总数', value: 0, icon: 'user', color: '#1890ff' },
        { key: 'class', title: '班级总数', value: 0, icon: 'appstore', color: '#52c41a' },
        { key: 'attendance', title: '今日正常出勤', value: 0, icon: 'check-circle', color: '#13c2c2' },
        { key: 'pending', title: '待处理事项', value: 0, icon: 'clock-circle', color: '#faad14' }
      ],
      todos: [],
      recentActivities: [],
      attendanceChart: null,
      gradeChart: null
    };
  },
  mounted() {
    this.fetchData();
    this.initCharts();
  },
  methods: {
    async fetchData() {
      try {
        const res = await api.dashboard.overview();
        if (res.success) {
          this.statistics[0].value = res.data.studentCount;
          this.statistics[1].value = res.data.classCount;
          this.statistics[2].value = res.data.todayAttendance?.normal || 0;
          this.statistics[3].value = res.data.pendingLeave + res.data.pendingHomework;
          
          this.todos = [
            { title: '待审批请假', description: `${res.data.pendingLeave} 条待处理`, status: '待处理', color: 'orange' },
            { title: '进行中作业', description: `${res.data.pendingHomework} 项作业`, status: '进行中', color: 'blue' }
          ];
        }
        
        const activitiesRes = await api.dashboard.recentActivities({ limit: 5 });
        if (activitiesRes.success) {
          this.recentActivities = activitiesRes.data;
        }
      } catch (error) {
        console.error(error);
      }
    },
    initCharts() {
      this.attendanceChart = echarts.init(this.$refs.attendanceChart);
      this.gradeChart = echarts.init(this.$refs.gradeChart);
      
      this.loadAttendanceChart();
      this.loadGradeChart();
      
      window.addEventListener('resize', () => {
        this.attendanceChart?.resize();
        this.gradeChart?.resize();
      });
    },
    async loadAttendanceChart() {
      try {
        const res = await api.dashboard.attendanceChart({});
        if (res.success) {
          const option = {
            tooltip: { trigger: 'axis' },
            legend: { data: ['正常', '迟到', '旷课', '请假'] },
            xAxis: { type: 'category', data: res.data.map(d => d.date) },
            yAxis: { type: 'value' },
            series: [
              { name: '正常', type: 'line', data: res.data.map(d => d.normal) },
              { name: '迟到', type: 'line', data: res.data.map(d => d.late) },
              { name: '旷课', type: 'line', data: res.data.map(d => d.absent) },
              { name: '请假', type: 'line', data: res.data.map(d => d.leave_count) }
            ]
          };
          this.attendanceChart.setOption(option);
        }
      } catch (error) {
        console.error(error);
      }
    },
    async loadGradeChart() {
      try {
        const res = await api.dashboard.gradeChart({});
        if (res.success) {
          const option = {
            tooltip: { trigger: 'axis' },
            legend: { data: ['平均分', '最高分', '最低分'] },
            xAxis: { type: 'category', data: res.data.map(d => d.subject_name) },
            yAxis: { type: 'value' },
            series: [
              { name: '平均分', type: 'bar', data: res.data.map(d => d.avg_score?.toFixed(1)) },
              { name: '最高分', type: 'line', data: res.data.map(d => d.max_score) },
              { name: '最低分', type: 'line', data: res.data.map(d => d.min_score) }
            ]
          };
          this.gradeChart.setOption(option);
        }
      } catch (error) {
        console.error(error);
      }
    },
    getActivityIcon(type) {
      const icons = {
        announcement: 'notification',
        activity: 'picture',
        homework: 'edit'
      };
      return icons[type] || 'file';
    }
  },
  beforeDestroy() {
    this.attendanceChart?.dispose();
    this.gradeChart?.dispose();
  }
};
</script>

<style lang="less" scoped>
.stat-card {
  text-align: center;
}
</style>
