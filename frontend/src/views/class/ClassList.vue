<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="班级名称">
          <a-input v-model="searchForm.keyword" placeholder="班级名称" allowClear />
        </a-form-item>
        <a-form-item label="年级">
          <a-select v-model="searchForm.grade" style="width: 120px" allowClear>
            <a-select-option v-for="g in grades" :key="g" :value="g">{{ g }}</a-select-option>
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
        <a-button type="primary" icon="plus" @click="showModal()">新增班级</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      >
        <span slot="name" slot-scope="text, record">
          <a @click="viewDetail(record.id)">{{ text }}</a>
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
    >
      <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="班级名称">
          <a-input
            v-decorator="['name', { rules: [{ required: true, message: '请输入班级名称' }] }]"
          />
        </a-form-item>
        <a-form-item label="年级">
          <a-select
            v-decorator="['grade', { rules: [{ required: true, message: '请选择年级' }] }]"
          >
            <a-select-option v-for="g in grades" :key="g" :value="g">{{ g }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="班主任">
          <a-select v-decorator="['teacherId']" allowClear show-search>
            <a-select-option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.real_name }}
            </a-select-option>
          </a-select>
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

export default {
  name: 'ClassList',
  data() {
    return {
      grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三'],
      teachers: [],
      searchForm: { keyword: '', grade: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '班级名称', dataIndex: 'name', scopedSlots: { customRender: 'name' } },
        { title: '年级', dataIndex: 'grade' },
        { title: '班主任', dataIndex: 'teacher_name' },
        { title: '学生人数', dataIndex: 'student_count' },
        { title: '描述', dataIndex: 'description', ellipsis: true },
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
      return this.editingId ? '编辑班级' : '新增班级';
    }
  },
  mounted() {
    this.fetchData();
    this.fetchTeachers();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const res = await api.classes.list({
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
    async fetchTeachers() {
      const res = await api.users.list({ role: 'teacher', pageSize: 100 });
      if (res.success) {
        this.teachers = res.data.list;
      }
    },
    handleTableChange(pagination) {
      this.pagination.current = pagination.current;
      this.fetchData();
    },
    resetSearch() {
      this.searchForm = { keyword: '', grade: undefined };
      this.pagination.current = 1;
      this.fetchData();
    },
    viewDetail(id) {
      this.$router.push(`/class/${id}`);
    },
    showModal(record = null) {
      this.editingId = record?.id || null;
      this.visible = true;
      this.$nextTick(() => {
        this.form.resetFields();
        if (record) {
          this.form.setFieldsValue({
            name: record.name,
            grade: record.grade,
            teacherId: record.teacher_id,
            description: record.description
          });
        }
      });
    },
    handleSubmit() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          this.confirmLoading = true;
          try {
            let res;
            if (this.editingId) {
              res = await api.classes.update(this.editingId, values);
            } else {
              res = await api.classes.create(values);
            }
            if (res.success) {
              this.$message.success(this.editingId ? '更新成功' : '创建成功');
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
      const res = await api.classes.delete(id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchData();
      }
    }
  }
};
</script>
