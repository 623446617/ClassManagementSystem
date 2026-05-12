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
        <a-form-item label="学期">
          <a-input v-model="searchForm.semester" placeholder="如: 2024-2025学年第一学期" allowClear />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchData">查询</a-button>
          <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
        </a-form-item>
      </a-form>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <a-button type="primary" icon="plus" @click="showModal()">添加评价</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      >
        <span slot="action" slot-scope="text, record">
          <a @click="showModal(record)">编辑</a>
          <a-divider type="vertical" />
          <a-popconfirm title="确定删除？" @confirm="handleDelete(record.id)">
            <a style="color: red">删除</a>
          </a-popconfirm>
        </span>
      </a-table>
    </div>

    <a-modal
      :title="modalTitle"
      :visible="visible"
      :confirm-loading="confirmLoading"
      @ok="handleSubmit"
      @cancel="visible = false"
      width="600px"
    >
      <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="学生">
          <a-select
            v-decorator="['studentId', { rules: [{ required: true }] }]"
            show-search
            :filter-option="filterOption"
            :disabled="!!editingId"
          >
            <a-select-option v-for="s in students" :key="s.id" :value="s.id">
              {{ s.student_no }} - {{ s.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="学期">
          <a-input v-decorator="['semester', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="道德品质">
          <a-rate v-decorator="['moralScore', { initialValue: 3 }]" :count="5" />
        </a-form-item>
        <a-form-item label="学业水平">
          <a-rate v-decorator="['academicScore', { initialValue: 3 }]" :count="5" />
        </a-form-item>
        <a-form-item label="身心健康">
          <a-rate v-decorator="['physicalScore', { initialValue: 3 }]" :count="5" />
        </a-form-item>
        <a-form-item label="艺术素养">
          <a-rate v-decorator="['artScore', { initialValue: 3 }]" :count="5" />
        </a-form-item>
        <a-form-item label="劳动实践">
          <a-rate v-decorator="['laborScore', { initialValue: 3 }]" :count="5" />
        </a-form-item>
        <a-form-item label="评语">
          <a-textarea v-decorator="['comment']" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';

export default {
  name: 'EvaluationList',
  data() {
    return {
      students: [],
      searchForm: { studentId: undefined, semester: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'student_name' },
        { title: '学期', dataIndex: 'semester' },
        { title: '道德品质', dataIndex: 'moral_score' },
        { title: '学业水平', dataIndex: 'academic_score' },
        { title: '身心健康', dataIndex: 'physical_score' },
        { title: '艺术素养', dataIndex: 'art_score' },
        { title: '劳动实践', dataIndex: 'labor_score' },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 120 }
      ],
      visible: false,
      confirmLoading: false,
      editingId: null,
      form: this.$form.createForm(this)
    };
  },
  computed: {
    modalTitle() {
      return this.editingId ? '编辑评价' : '添加评价';
    }
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
        const res = await api.rewards.evaluations({
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
      this.searchForm = { studentId: undefined, semester: undefined };
      this.pagination.current = 1;
      this.fetchData();
    },
    showModal(record = null) {
      this.editingId = record?.id || null;
      this.visible = true;
      this.$nextTick(() => {
        this.form.resetFields();
        if (record) {
          this.form.setFieldsValue({
            studentId: record.student_id,
            semester: record.semester,
            moralScore: record.moral_score,
            academicScore: record.academic_score,
            physicalScore: record.physical_score,
            artScore: record.art_score,
            laborScore: record.labor_score,
            comment: record.comment
          });
        }
      });
    },
    handleSubmit() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          this.confirmLoading = true;
          try {
            const res = await api.rewards.createEvaluation(values);
            if (res.success) {
              this.$message.success(this.editingId ? '更新成功' : '添加成功');
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
      const res = await api.rewards.deleteEvaluation(id);
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
