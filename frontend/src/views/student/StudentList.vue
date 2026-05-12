<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="关键词">
          <a-input v-model="searchForm.keyword" placeholder="姓名/学号" allowClear />
        </a-form-item>
        <a-form-item label="班级">
          <a-select v-model="searchForm.classId" style="width: 150px" allowClear>
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="searchForm.status" style="width: 100px" allowClear>
            <a-select-option value="在校">在校</a-select-option>
            <a-select-option value="转学">转学</a-select-option>
            <a-select-option value="毕业">毕业</a-select-option>
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
        <a-button type="primary" icon="plus" @click="showModal()">新增学生</a-button>
        <a-button icon="upload" style="margin-left: 8px" @click="showImportModal">批量导入</a-button>
        <a-button icon="download" style="margin-left: 8px" @click="exportData">导出</a-button>
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
          <a @click="showModal(record)">编辑</a>
          <a-divider type="vertical" />
          <a @click="showParentModal(record)">家长</a>
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
        <a-form-item label="学号">
          <a-input
            v-decorator="['studentNo', { rules: [{ required: true, message: '请输入学号' }] }]"
            :disabled="!!editingId"
          />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input v-decorator="['name', { rules: [{ required: true, message: '请输入姓名' }] }]" />
        </a-form-item>
        <a-form-item label="性别">
          <a-radio-group v-decorator="['gender', { initialValue: '男' }]">
            <a-radio value="男">男</a-radio>
            <a-radio value="女">女</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="出生日期">
          <a-date-picker v-decorator="['birthDate']" />
        </a-form-item>
        <a-form-item label="班级">
          <a-select v-decorator="['classId', { rules: [{ required: true, message: '请选择班级' }] }]">
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="入学日期">
          <a-date-picker v-decorator="['enrollmentDate']" />
        </a-form-item>
        <a-form-item label="家庭住址">
          <a-input v-decorator="['address']" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-decorator="['status', { initialValue: '在校' }]">
            <a-select-option value="在校">在校</a-select-option>
            <a-select-option value="转学">转学</a-select-option>
            <a-select-option value="毕业">毕业</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="联系电话">
          <a-input v-decorator="['phone']" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-decorator="['email']" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      title="家长信息"
      :visible="parentVisible"
      :footer="null"
      @cancel="parentVisible = false"
      width="700px"
    >
      <a-button type="primary" icon="plus" @click="showAddParentModal" style="margin-bottom: 16px">添加家长</a-button>
      <a-table :columns="parentColumns" :data-source="parents" row-key="id" size="small">
        <span slot="action" slot-scope="text, record">
          <a-popconfirm title="确定删除？" @confirm="deleteParent(record.id)">
            <a style="color: red">删除</a>
          </a-popconfirm>
        </span>
      </a-table>
    </a-modal>

    <a-modal
      title="添加家长"
      :visible="addParentVisible"
      :confirm-loading="addParentLoading"
      @ok="submitParent"
      @cancel="addParentVisible = false"
    >
      <a-form :form="parentForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="姓名">
          <a-input v-decorator="['name', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="关系">
          <a-select v-decorator="['relationship', { rules: [{ required: true }] }]">
            <a-select-option value="父亲">父亲</a-select-option>
            <a-select-option value="母亲">母亲</a-select-option>
            <a-select-option value="爷爷">爷爷</a-select-option>
            <a-select-option value="奶奶">奶奶</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="电话">
          <a-input v-decorator="['phone']" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-decorator="['email']" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      title="批量导入学生"
      :visible="importVisible"
      :confirm-loading="importLoading"
      @ok="handleImport"
      @cancel="importVisible = false"
      width="600px"
    >
      <a-alert message="请按以下格式填写数据，每行一个学生" type="info" style="margin-bottom: 16px" />
      <a-textarea
        v-model="importText"
        :rows="10"
        placeholder="学号,姓名,性别,班级ID,出生日期,入学日期,家庭住址&#10;示例: 2024001,张三,男,1,2010-01-01,2024-09-01,北京市朝阳区"
      />
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';
import moment from 'moment';

export default {
  name: 'StudentList',
  data() {
    return {
      classes: [],
      searchForm: { keyword: '', classId: undefined, status: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'name' },
        { title: '性别', dataIndex: 'gender', width: 60 },
        { title: '班级', dataIndex: 'class_name' },
        { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 80 },
        { title: '家长数', dataIndex: 'parent_count', width: 80 },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 180 }
      ],
      visible: false,
      confirmLoading: false,
      editingId: null,
      form: this.$form.createForm(this),
      parentVisible: false,
      addParentVisible: false,
      addParentLoading: false,
      currentStudentId: null,
      parents: [],
      parentColumns: [
        { title: '姓名', dataIndex: 'name' },
        { title: '关系', dataIndex: 'relationship' },
        { title: '电话', dataIndex: 'phone' },
        { title: '邮箱', dataIndex: 'email' },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 80 }
      ],
      parentForm: this.$form.createForm(this),
      importVisible: false,
      importLoading: false,
      importText: ''
    };
  },
  computed: {
    modalTitle() {
      return this.editingId ? '编辑学生' : '新增学生';
    }
  },
  mounted() {
    this.fetchClasses();
    this.fetchData();
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
        const res = await api.students.list({
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
      this.searchForm = { keyword: '', classId: undefined, status: undefined };
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
            studentNo: record.student_no,
            name: record.name,
            gender: record.gender,
            birthDate: record.birth_date ? moment(record.birth_date) : null,
            classId: record.class_id,
            enrollmentDate: record.enrollment_date ? moment(record.enrollment_date) : null,
            address: record.address,
            status: record.status
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
              birthDate: values.birthDate ? moment(values.birthDate).format('YYYY-MM-DD') : null,
              enrollmentDate: values.enrollmentDate ? moment(values.enrollmentDate).format('YYYY-MM-DD') : null
            };
            let res;
            if (this.editingId) {
              res = await api.students.update(this.editingId, data);
            } else {
              res = await api.students.create(data);
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
      const res = await api.students.delete(id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchData();
      }
    },
    async showParentModal(record) {
      this.currentStudentId = record.id;
      const res = await api.students.parents(record.id);
      if (res.success) {
        this.parents = res.data;
      }
      this.parentVisible = true;
    },
    showAddParentModal() {
      this.addParentVisible = true;
      this.$nextTick(() => {
        this.parentForm.resetFields();
      });
    },
    async submitParent() {
      this.parentForm.validateFields(async (err, values) => {
        if (!err) {
          this.addParentLoading = true;
          try {
            const res = await api.students.createParent(this.currentStudentId, values);
            if (res.success) {
              this.$message.success('添加成功');
              this.addParentVisible = false;
              const parentRes = await api.students.parents(this.currentStudentId);
              if (parentRes.success) {
                this.parents = parentRes.data;
              }
            }
          } finally {
            this.addParentLoading = false;
          }
        }
      });
    },
    async deleteParent(id) {
      const res = await api.students.deleteParent(this.currentStudentId, id);
      if (res.success) {
        this.$message.success('删除成功');
        const parentRes = await api.students.parents(this.currentStudentId);
        if (parentRes.success) {
          this.parents = parentRes.data;
        }
      }
    },
    showImportModal() {
      this.importVisible = true;
      this.importText = '';
    },
    async handleImport() {
      if (!this.importText.trim()) {
        this.$message.error('请输入数据');
        return;
      }
      this.importLoading = true;
      try {
        const lines = this.importText.trim().split('\n');
        const students = lines.map(line => {
          const [studentNo, name, gender, classId, birthDate, enrollmentDate, address] = line.split(',');
          return { studentNo, name, gender: gender || '男', classId: parseInt(classId), birthDate, enrollmentDate, address };
        }).filter(s => s.studentNo && s.name && s.classId);
        
        const res = await api.students.import({ students });
        if (res.success) {
          this.$message.success(`导入完成: 成功${res.data.success}条, 失败${res.data.failed}条`);
          this.importVisible = false;
          this.fetchData();
        }
      } finally {
        this.importLoading = false;
      }
    },
    exportData() {
      const csv = ['ID,学号,姓名,性别,班级,状态'];
      this.data.forEach(item => {
        csv.push(`${item.id},${item.student_no},${item.name},${item.gender},${item.class_name},${item.status}`);
      });
      const blob = new Blob(['\ufeff' + csv.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `学生列表_${moment().format('YYYYMMDD')}.csv`;
      a.click();
    },
    getStatusColor(status) {
      const colors = { '在校': 'green', '转学': 'orange', '毕业': 'blue' };
      return colors[status] || 'default';
    }
  }
};
</script>
