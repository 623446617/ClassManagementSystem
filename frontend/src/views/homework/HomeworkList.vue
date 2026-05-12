<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="班级">
          <a-select v-model="searchForm.classId" style="width: 150px" allowClear>
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="科目">
          <a-select v-model="searchForm.subjectId" style="width: 120px" allowClear>
            <a-select-option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
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
        <a-button type="primary" icon="plus" @click="showModal()">发布作业</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      >
        <span slot="title" slot-scope="text, record">
          <a @click="viewDetail(record.id)">{{ text }}</a>
        </span>
        <span slot="deadline" slot-scope="text">
          <span :style="{ color: isExpired(text) ? 'red' : '' }">{{ text }}</span>
        </span>
        <span slot="action" slot-scope="text, record">
          <a @click="viewDetail(record.id)">查看</a>
          <a-divider type="vertical" />
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
      <a-form :form="form" :label-col="{ span: 5 }" :wrapper-col="{ span: 17 }">
        <a-form-item label="班级">
          <a-select v-decorator="['classId', { rules: [{ required: true }] }]">
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="科目">
          <a-select v-decorator="['subjectId', { rules: [{ required: true }] }]">
            <a-select-option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="标题">
          <a-input v-decorator="['title', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="内容">
          <a-textarea v-decorator="['content', { rules: [{ required: true }] }]" :rows="4" />
        </a-form-item>
        <a-form-item label="截止时间">
          <a-date-picker v-decorator="['deadline']" show-time />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';
import moment from 'moment';

export default {
  name: 'HomeworkList',
  data() {
    return {
      classes: [],
      subjects: [],
      searchForm: { classId: undefined, subjectId: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '标题', dataIndex: 'title', scopedSlots: { customRender: 'title' } },
        { title: '班级', dataIndex: 'class_name' },
        { title: '科目', dataIndex: 'subject_name' },
        { title: '发布人', dataIndex: 'publisher_name' },
        { title: '截止时间', dataIndex: 'deadline', scopedSlots: { customRender: 'deadline' } },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 180 }
      ],
      visible: false,
      confirmLoading: false,
      editingId: null,
      form: this.$form.createForm(this)
    };
  },
  computed: {
    modalTitle() {
      return this.editingId ? '编辑作业' : '发布作业';
    }
  },
  mounted() {
    this.fetchClasses();
    this.fetchSubjects();
    this.fetchData();
  },
  methods: {
    async fetchClasses() {
      const res = await api.classes.all();
      if (res.success) this.classes = res.data;
    },
    async fetchSubjects() {
      const res = await api.grades.subjects();
      if (res.success) this.subjects = res.data;
    },
    async fetchData() {
      this.loading = true;
      try {
        const res = await api.homework.list({
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
      this.searchForm = { classId: undefined, subjectId: undefined };
      this.pagination.current = 1;
      this.fetchData();
    },
    viewDetail(id) {
      this.$router.push(`/homework/${id}`);
    },
    showModal(record = null) {
      this.editingId = record?.id || null;
      this.visible = true;
      this.$nextTick(() => {
        this.form.resetFields();
        if (record) {
          this.form.setFieldsValue({
            classId: record.class_id,
            subjectId: record.subject_id,
            title: record.title,
            content: record.content,
            deadline: record.deadline ? moment(record.deadline) : null
          });
        }
      });
    },
    handleSubmit() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          this.confirmLoading = true;
          try {
            const data = {
              ...values,
              deadline: values.deadline ? moment(values.deadline).format('YYYY-MM-DD HH:mm:ss') : null
            };
            let res;
            if (this.editingId) {
              res = await api.homework.update(this.editingId, data);
            } else {
              res = await api.homework.create(data);
            }
            if (res.success) {
              this.$message.success(this.editingId ? '更新成功' : '发布成功');
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
      const res = await api.homework.delete(id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchData();
      }
    },
    isExpired(date) {
      return moment(date).isBefore(moment());
    }
  }
};
</script>
