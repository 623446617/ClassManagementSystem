<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="学生">
          <a-select v-model="searchForm.studentId" style="width: 200px" allowClear show-search :filter-option="filterOption">
            <a-select-option v-for="s in students" :key="s.id" :value="s.id">
              {{ s.student_no }} - {{ s.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="类型">
          <a-select v-model="searchForm.type" style="width: 100px" allowClear>
            <a-select-option value="奖励">奖励</a-select-option>
            <a-select-option value="处罚">处罚</a-select-option>
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
        <a-button type="primary" icon="plus" @click="showModal()">添加记录</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      >
        <span slot="type" slot-scope="text">
          <a-tag :color="text === '奖励' ? 'green' : 'red'">{{ text }}</a-tag>
        </span>
        <span slot="action" slot-scope="text, record">
          <a-popconfirm title="确定删除？" @confirm="handleDelete(record.id)">
            <a style="color: red">删除</a>
          </a-popconfirm>
        </span>
      </a-table>
    </div>

    <a-modal
      title="添加奖惩记录"
      :visible="visible"
      :confirm-loading="confirmLoading"
      @ok="handleSubmit"
      @cancel="visible = false"
    >
      <a-form :form="form" :label-col="{ span: 5 }" :wrapper-col="{ span: 17 }">
        <a-form-item label="学生">
          <a-select
            v-decorator="['studentId', { rules: [{ required: true }] }]"
            show-search
            :filter-option="filterOption"
          >
            <a-select-option v-for="s in students" :key="s.id" :value="s.id">
              {{ s.student_no }} - {{ s.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="类型">
          <a-radio-group v-decorator="['type', { initialValue: '奖励' }]">
            <a-radio value="奖励">奖励</a-radio>
            <a-radio value="处罚">处罚</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="标题">
          <a-input v-decorator="['title', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="日期">
          <a-date-picker v-decorator="['date', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-decorator="['description']" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';
import moment from 'moment';

export default {
  name: 'RewardList',
  data() {
    return {
      students: [],
      searchForm: { studentId: undefined, type: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'student_name' },
        { title: '类型', dataIndex: 'type', scopedSlots: { customRender: 'type' } },
        { title: '标题', dataIndex: 'title' },
        { title: '日期', dataIndex: 'date' },
        { title: '描述', dataIndex: 'description', ellipsis: true },
        { title: '记录人', dataIndex: 'recorder_name' },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 80 }
      ],
      visible: false,
      confirmLoading: false,
      form: this.$form.createForm(this)
    };
  },
  mounted() {
    this.fetchStudents();
    this.fetchData();
  },
  methods: {
    async fetchStudents() {
      const res = await api.students.list({ pageSize: 500 });
      if (res.success) this.students = res.data.list;
    },
    async fetchData() {
      this.loading = true;
      try {
        const res = await api.rewards.list({
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
      this.searchForm = { studentId: undefined, type: undefined };
      this.pagination.current = 1;
      this.fetchData();
    },
    showModal() {
      this.visible = true;
      this.$nextTick(() => this.form.resetFields());
    },
    handleSubmit() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          this.confirmLoading = true;
          try {
            const data = {
              ...values,
              date: moment(values.date).format('YYYY-MM-DD')
            };
            const res = await api.rewards.create(data);
            if (res.success) {
              this.$message.success('添加成功');
              this.visible = false;
              this.fetchData();
            }
          } finally {
            this.confirmLoading = false;
          }
        }
      });
    },
    async handleDelete(id) {
      const res = await api.rewards.delete(id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchData();
      }
    },
    filterOption(input, option) {
      return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0;
    }
  }
};
</script>
