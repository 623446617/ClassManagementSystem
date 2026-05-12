<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="班级">
          <a-select v-model="searchForm.classId" style="width: 150px" allowClear>
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="searchForm.status" style="width: 100px" allowClear>
            <a-select-option value="待审批">待审批</a-select-option>
            <a-select-option value="已批准">已批准</a-select-option>
            <a-select-option value="已拒绝">已拒绝</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchData">查询</a-button>
          <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
        </a-form-item>
      </a-form>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <a-button type="primary" icon="plus" @click="showModal">申请请假</a-button>
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
        <span slot="action" slot-scope="text, record">
          <template v-if="record.status === '待审批' && canApprove">
            <a @click="handleApprove(record.id, '已批准')">批准</a>
            <a-divider type="vertical" />
            <a @click="handleApprove(record.id, '已拒绝')">拒绝</a>
          </template>
          <span v-else>-</span>
        </span>
      </a-table>
    </div>

    <a-modal
      title="申请请假"
      :visible="visible"
      :confirm-loading="confirmLoading"
      @ok="handleSubmit"
      @cancel="visible = false"
    >
      <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="学生">
          <a-select
            v-decorator="['studentId', { rules: [{ required: true, message: '请选择学生' }] }]"
            show-search
            :filter-option="filterOption"
          >
            <a-select-option v-for="s in students" :key="s.id" :value="s.id">
              {{ s.student_no }} - {{ s.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="开始日期">
          <a-date-picker v-decorator="['startDate', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="结束日期">
          <a-date-picker v-decorator="['endDate', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="请假原因">
          <a-textarea v-decorator="['reason', { rules: [{ required: true }] }]" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';
import moment from 'moment';
import { mapGetters } from 'vuex';

export default {
  name: 'LeaveRequest',
  data() {
    return {
      classes: [],
      students: [],
      searchForm: { classId: undefined, status: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'student_name' },
        { title: '班级', dataIndex: 'class_name' },
        { title: '开始日期', dataIndex: 'start_date' },
        { title: '结束日期', dataIndex: 'end_date' },
        { title: '原因', dataIndex: 'reason', ellipsis: true },
        { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' } },
        { title: '审批人', dataIndex: 'approver_name' },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 120 }
      ],
      visible: false,
      confirmLoading: false,
      form: this.$form.createForm(this)
    };
  },
  computed: {
    ...mapGetters(['userRole']),
    canApprove() {
      return this.userRole === 'admin' || this.userRole === 'teacher';
    }
  },
  mounted() {
    this.fetchClasses();
    this.fetchStudents();
    this.fetchData();
  },
  methods: {
    async fetchClasses() {
      const res = await api.classes.all();
      if (res.success) {
        this.classes = res.data;
      }
    },
    async fetchStudents() {
      const res = await api.students.list({ pageSize: 500 });
      if (res.success) {
        this.students = res.data.list;
      }
    },
    async fetchData() {
      this.loading = true;
      try {
        const res = await api.attendance.leaveRequests({
          page: this.pagination.current,
          pageSize: this.pagination.pageSize,
          ...this.searchForm
        });
        if (res.success) {
          this.data = res.data.list;
          this.pagination.total = res.data.total;
        }
      } finally {
        this.loading = false;
      }
    },
    handleTableChange(pagination) {
      this.pagination.current = pagination.current;
      this.fetchData();
    },
    resetSearch() {
      this.searchForm = { classId: undefined, status: undefined };
      this.pagination.current = 1;
      this.fetchData();
    },
    showModal() {
      this.visible = true;
      this.$nextTick(() => {
        this.form.resetFields();
      });
    },
    handleSubmit() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          this.confirmLoading = true;
          try {
            const student = this.students.find(s => s.id === values.studentId);
            const data = {
              ...values,
              classId: student.class_id,
              startDate: moment(values.startDate).format('YYYY-MM-DD'),
              endDate: moment(values.endDate).format('YYYY-MM-DD')
            };
            const res = await api.attendance.createLeaveRequest(data);
            if (res.success) {
              this.$message.success('申请成功');
              this.visible = false;
              this.fetchData();
            }
          } finally {
            this.confirmLoading = false;
          }
        }
      });
    },
    async handleApprove(id, status) {
      const res = await api.attendance.approveLeaveRequest(id, { status });
      if (res.success) {
        this.$message.success('审批成功');
        this.fetchData();
      }
    },
    filterOption(input, option) {
      return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0;
    },
    getStatusColor(status) {
      const colors = { '待审批': 'orange', '已批准': 'green', '已拒绝': 'red' };
      return colors[status] || 'default';
    }
  }
};
</script>
