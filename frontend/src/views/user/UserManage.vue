<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="关键词">
          <a-input v-model="searchForm.keyword" placeholder="用户名/姓名" allowClear />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model="searchForm.role" style="width: 120px" allowClear>
            <a-select-option value="admin">管理员</a-select-option>
            <a-select-option value="teacher">班主任</a-select-option>
            <a-select-option value="student">学生</a-select-option>
            <a-select-option value="parent">家长</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="searchForm.status" style="width: 100px" allowClear>
            <a-select-option :value="1">启用</a-select-option>
            <a-select-option :value="0">禁用</a-select-option>
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
        <a-button type="primary" icon="plus" @click="showModal()">新增用户</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      >
        <span slot="role" slot-scope="text">
          <a-tag :color="getRoleColor(text)">{{ getRoleName(text) }}</a-tag>
        </span>
        <span slot="status" slot-scope="text">
          <a-tag :color="text === 1 ? 'green' : 'red'">
            {{ text === 1 ? '启用' : '禁用' }}
          </a-tag>
        </span>
        <span slot="action" slot-scope="text, record">
          <a @click="showModal(record)">编辑</a>
          <a-divider type="vertical" />
          <a @click="resetPassword(record)">重置密码</a>
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
        <a-form-item label="用户名">
          <a-input
            v-decorator="['username', { rules: [{ required: true, message: '请输入用户名' }] }]"
            :disabled="!!editingId"
          />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input
            v-decorator="['real_name', { rules: [{ required: true, message: '请输入姓名' }] }]"
          />
        </a-form-item>
        <a-form-item label="角色">
          <a-select
            v-decorator="['role', { rules: [{ required: true, message: '请选择角色' }] }]"
          >
            <a-select-option value="admin">管理员</a-select-option>
            <a-select-option value="teacher">班主任</a-select-option>
            <a-select-option value="student">学生</a-select-option>
            <a-select-option value="parent">家长</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="手机号">
          <a-input v-decorator="['phone']" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-decorator="['email']" />
        </a-form-item>
        <a-form-item v-if="!editingId" label="密码">
          <a-input-password
            v-decorator="['password', { rules: [{ required: true, message: '请输入密码' }] }]"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-switch
            v-decorator="['status', { valuePropName: 'checked', initialValue: true }]"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';

export default {
  name: 'UserManage',
  data() {
    return {
      searchForm: { keyword: '', role: undefined, status: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '用户名', dataIndex: 'username' },
        { title: '姓名', dataIndex: 'real_name' },
        { title: '角色', dataIndex: 'role', scopedSlots: { customRender: 'role' } },
        { title: '手机号', dataIndex: 'phone' },
        { title: '邮箱', dataIndex: 'email' },
        { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' } },
        { title: '创建时间', dataIndex: 'created_at' },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 200 }
      ],
      visible: false,
      confirmLoading: false,
      editingId: null,
      form: this.$form.createForm(this)
    };
  },
  computed: {
    modalTitle() {
      return this.editingId ? '编辑用户' : '新增用户';
    }
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const res = await api.users.list({
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
      this.searchForm = { keyword: '', role: undefined, status: undefined };
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
            username: record.username,
            real_name: record.real_name,
            role: record.role,
            phone: record.phone,
            email: record.email,
            status: record.status === 1
          });
        }
      });
    },
    handleSubmit() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          this.confirmLoading = true;
          try {
            const data = { ...values, status: values.status ? 1 : 0 };
            let res;
            if (this.editingId) {
              res = await api.users.update(this.editingId, data);
            } else {
              res = await api.users.create(data);
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
      const res = await api.users.delete(id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchData();
      }
    },
    async resetPassword(record) {
      this.$confirm({
        title: '确认重置',
        content: `确定要重置用户 ${record.username} 的密码吗？`,
        onOk: async () => {
          const res = await api.users.resetPassword(record.id);
          if (res.success) {
            this.$message.success('密码已重置为123456');
          }
        }
      });
    },
    getRoleName(role) {
      const names = { admin: '管理员', teacher: '班主任', student: '学生', parent: '家长' };
      return names[role] || role;
    },
    getRoleColor(role) {
      const colors = { admin: 'red', teacher: 'blue', student: 'green', parent: 'orange' };
      return colors[role] || 'default';
    }
  }
};
</script>
