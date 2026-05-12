<template>
  <div class="page-container">
    <div class="table-container">
      <div class="table-toolbar">
        <a-button type="primary" icon="plus" @click="showModal()">新增角色</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="data"
        :loading="loading"
        row-key="id"
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
    >
      <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="角色名称">
          <a-input
            v-decorator="['name', { rules: [{ required: true, message: '请输入角色名称' }] }]"
          />
        </a-form-item>
        <a-form-item label="角色编码">
          <a-input
            v-decorator="['code', { rules: [{ required: true, message: '请输入角色编码' }] }]"
            :disabled="!!editingId"
          />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-decorator="['description']" :rows="3" />
        </a-form-item>
        <a-form-item label="权限">
          <a-textarea
            v-decorator="['permissions']"
            :rows="3"
            placeholder="多个权限用逗号分隔"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';

export default {
  name: 'RoleManage',
  data() {
    return {
      data: [],
      loading: false,
      columns: [
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '角色名称', dataIndex: 'name' },
        { title: '角色编码', dataIndex: 'code' },
        { title: '描述', dataIndex: 'description' },
        { title: '权限', dataIndex: 'permissions' },
        { title: '创建时间', dataIndex: 'created_at' },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 150 }
      ],
      visible: false,
      confirmLoading: false,
      editingId: null,
      form: this.$form.createForm(this)
    };
  },
  computed: {
    modalTitle() {
      return this.editingId ? '编辑角色' : '新增角色';
    }
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const res = await api.roles.list();
        if (res.success) {
          this.data = res.data;
        }
      } finally {
        this.loading = false;
      }
    },
    showModal(record = null) {
      this.editingId = record?.id || null;
      this.visible = true;
      this.$nextTick(() => {
        this.form.resetFields();
        if (record) {
          this.form.setFieldsValue({
            name: record.name,
            code: record.code,
            description: record.description,
            permissions: record.permissions
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
              res = await api.roles.update(this.editingId, values);
            } else {
              res = await api.roles.create(values);
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
      const res = await api.roles.delete(id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchData();
      }
    }
  }
};
</script>
