<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="班级">
          <a-select v-model="searchForm.classId" style="width: 150px" allowClear>
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="日期">
          <a-date-picker v-model="searchForm.date" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="searchForm.status" style="width: 100px" allowClear>
            <a-select-option value="正常">正常</a-select-option>
            <a-select-option value="迟到">迟到</a-select-option>
            <a-select-option value="旷课">旷课</a-select-option>
            <a-select-option value="请假">请假</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchData">查询</a-button>
          <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-row :gutter="24" style="margin-bottom: 24px">
      <a-col :span="6">
        <a-card>
          <a-statistic title="正常出勤" :value="statistics.normal_count" :value-style="{ color: '#3f8600' }">
            <a-icon type="check-circle" slot="prefix" />
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="迟到" :value="statistics.late_count" :value-style="{ color: '#faad14' }">
            <a-icon type="clock-circle" slot="prefix" />
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="旷课" :value="statistics.absent_count" :value-style="{ color: '#cf1322' }">
            <a-icon type="close-circle" slot="prefix" />
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="请假" :value="statistics.leave_count" :value-style="{ color: '#1890ff' }">
            <a-icon type="file-text" slot="prefix" />
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <div class="table-container">
      <div class="table-toolbar">
        <a-button type="primary" icon="plus" @click="showBatchModal">批量登记</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      >
        <span slot="status" slot-scope="text">
          <a-tag :color="getStatusColor(text)">{{ text }}</a-tag>
        </span>
      </a-table>
    </div>

    <a-modal
      title="批量登记考勤"
      :visible="batchVisible"
      :confirm-loading="batchLoading"
      @ok="submitBatch"
      @cancel="batchVisible = false"
      width="800px"
    >
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="班级">
          <a-select v-model="batchForm.classId" @change="loadClassStudents">
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="日期">
          <a-date-picker v-model="batchForm.date" />
        </a-form-item>
      </a-form>
      <a-table :columns="batchColumns" :data-source="batchStudents" row-key="id" size="small">
        <span slot="status" slot-scope="text, record">
          <a-select v-model="record.status" style="width: 100px">
            <a-select-option value="正常">正常</a-select-option>
            <a-select-option value="迟到">迟到</a-select-option>
            <a-select-option value="旷课">旷课</a-select-option>
            <a-select-option value="请假">请假</a-select-option>
          </a-select>
        </span>
        <span slot="reason" slot-scope="text, record">
          <a-input v-model="record.reason" size="small" />
        </span>
      </a-table>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';
import moment from 'moment';

export default {
  name: 'Attendance',
  data() {
    return {
      classes: [],
      searchForm: { classId: undefined, date: moment(), status: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      statistics: { normal_count: 0, late_count: 0, absent_count: 0, leave_count: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'student_name' },
        { title: '班级', dataIndex: 'class_name' },
        { title: '日期', dataIndex: 'date' },
        { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' } },
        { title: '原因', dataIndex: 'reason' }
      ],
      batchVisible: false,
      batchLoading: false,
      batchForm: { classId: undefined, date: moment() },
      batchStudents: [],
      batchColumns: [
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'name' },
        { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' } },
        { title: '原因', dataIndex: 'reason', scopedSlots: { customRender: 'reason' } }
      ]
    };
  },
  mounted() {
    this.fetchClasses();
    this.fetchData();
    this.fetchStatistics();
  },
  methods: {
    async fetchClasses() {
      const res = await api.classes.all();
      if (res.success) {
        this.classes = res.data;
      }
    },
    async fetchData() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.current,
          pageSize: this.pagination.pageSize,
          classId: this.searchForm.classId,
          status: this.searchForm.status
        };
        if (this.searchForm.date) {
          params.date = moment(this.searchForm.date).format('YYYY-MM-DD');
        }
        const res = await api.attendance.list(params);
        if (res.success) {
          this.data = res.data.list;
          this.pagination.total = res.data.total;
        }
      } finally {
        this.loading = false;
      }
    },
    async fetchStatistics() {
      const params = {};
      if (this.searchForm.classId) params.classId = this.searchForm.classId;
      if (this.searchForm.date) params.month = moment(this.searchForm.date).format('YYYY-MM');
      const res = await api.attendance.statistics(params);
      if (res.success) {
        this.statistics = res.data;
      }
    },
    handleTableChange(pagination) {
      this.pagination.current = pagination.current;
      this.fetchData();
    },
    resetSearch() {
      this.searchForm = { classId: undefined, date: moment(), status: undefined };
      this.pagination.current = 1;
      this.fetchData();
      this.fetchStatistics();
    },
    showBatchModal() {
      this.batchVisible = true;
      this.batchForm = { classId: undefined, date: moment() };
      this.batchStudents = [];
    },
    async loadClassStudents(classId) {
      const res = await api.students.list({ classId, pageSize: 100 });
      if (res.success) {
        this.batchStudents = res.data.list.map(s => ({
          ...s,
          status: '正常',
          reason: ''
        }));
      }
    },
    async submitBatch() {
      if (!this.batchForm.classId || !this.batchForm.date) {
        this.$message.error('请选择班级和日期');
        return;
      }
      this.batchLoading = true;
      try {
        const records = this.batchStudents.map(s => ({
          studentId: s.id,
          status: s.status,
          reason: s.reason
        }));
        const res = await api.attendance.batch({
          classId: this.batchForm.classId,
          date: moment(this.batchForm.date).format('YYYY-MM-DD'),
          records
        });
        if (res.success) {
          this.$message.success('登记成功');
          this.batchVisible = false;
          this.fetchData();
          this.fetchStatistics();
        }
      } finally {
        this.batchLoading = false;
      }
    },
    getStatusColor(status) {
      const colors = { '正常': 'green', '迟到': 'orange', '旷课': 'red', '请假': 'blue' };
      return colors[status] || 'default';
    }
  }
};
</script>
