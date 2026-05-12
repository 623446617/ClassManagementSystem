<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="班级">
          <a-select v-model="classId" style="width: 200px" @change="fetchSchedule">
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="saveSchedule" :loading="saving">保存课程表</a-button>
          <a-button style="margin-left: 8px" @click="printSchedule">打印</a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-card>
      <table class="schedule-table" ref="scheduleTable">
        <thead>
          <tr>
            <th>节次</th>
            <th v-for="day in days" :key="day">{{ day }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="period in periods" :key="period">
            <td>第{{ period }}节</td>
            <td v-for="day in 7" :key="day" class="schedule-cell">
              <a-select
                v-model="schedule[day][period]"
                style="width: 100%"
                allowClear
                placeholder="选择课程"
                @change="handleScheduleChange(day, period, $event)"
              >
                <a-select-option v-for="s in subjects" :key="s.id" :value="s.id">
                  {{ s.name }}
                </a-select-option>
              </a-select>
            </td>
          </tr>
        </tbody>
      </table>
    </a-card>
  </div>
</template>

<script>
import api from '../../api';

export default {
  name: 'Schedule',
  data() {
    return {
      classes: [],
      subjects: [],
      classId: undefined,
      days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      periods: [1, 2, 3, 4, 5, 6, 7, 8],
      schedule: {},
      saving: false
    };
  },
  created() {
    this.initSchedule();
  },
  mounted() {
    this.fetchClasses();
    this.fetchSubjects();
  },
  methods: {
    initSchedule() {
      for (let i = 1; i <= 7; i++) {
        this.$set(this.schedule, i, {});
        for (let j = 1; j <= 8; j++) {
          this.$set(this.schedule[i], j, null);
        }
      }
    },
    async fetchClasses() {
      const res = await api.classes.all();
      if (res.success) {
        this.classes = res.data;
        if (this.classes.length > 0) {
          this.classId = this.classes[0].id;
          this.fetchSchedule();
        }
      }
    },
    async fetchSubjects() {
      const res = await api.grades.subjects();
      if (res.success) {
        this.subjects = res.data;
      }
    },
    async fetchSchedule() {
      if (!this.classId) return;
      this.initSchedule();
      const res = await api.schedule.get(this.classId);
      if (res.success) {
        Object.keys(res.data).forEach(day => {
          Object.keys(res.data[day]).forEach(period => {
            const item = res.data[day][period];
            if (item) {
              this.$set(this.schedule[day], period, item.subject_id);
            }
          });
        });
      }
    },
    handleScheduleChange(day, period, subjectId) {
      this.$set(this.schedule[day], period, subjectId);
    },
    async saveSchedule() {
      if (!this.classId) {
        this.$message.error('请选择班级');
        return;
      }
      this.saving = true;
      try {
        const schedules = [];
        for (let day = 1; day <= 7; day++) {
          for (let period = 1; period <= 8; period++) {
            if (this.schedule[day][period]) {
              schedules.push({
                dayOfWeek: day,
                period: period,
                subjectId: this.schedule[day][period]
              });
            }
          }
        }
        const res = await api.schedule.batch({ classId: this.classId, schedules });
        if (res.success) {
          this.$message.success('保存成功');
        }
      } finally {
        this.saving = false;
      }
    },
    printSchedule() {
      window.print();
    }
  }
};
</script>

<style lang="less" scoped>
@media print {
  .search-form {
    display: none;
  }
}
</style>
