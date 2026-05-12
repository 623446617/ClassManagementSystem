<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="班级">
          <a-select v-model="searchForm.classId" style="width: 150px" allowClear>
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
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
        <a-button type="primary" icon="plus" @click="showModal()">发布活动</a-button>
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
      <a-form :form="form" :label-col="{ span: 5 }" :wrapper-col="{ span: 17 }">
        <a-form-item label="班级">
          <a-select v-decorator="['classId', { rules: [{ required: true }] }]">
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="活动名称">
          <a-input v-decorator="['title', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="活动日期">
          <a-date-picker v-decorator="['activityDate', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="活动地点">
          <a-input v-decorator="['location']" />
        </a-form-item>
        <a-form-item label="活动描述">
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
  name: 'ActivityList',
  data() {
    return {
      classes: [],
      searchForm: { classId: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '活动名称', dataIndex: 'title', scopedSlots: { customRender: 'title' } },
        { title: '班级', dataIndex: 'class_name' },
        { title: '活动日期', dataIndex: 'activity_date' },
        { title: '活动地点', dataIndex: 'location' },
        { title: '组织者', dataIndex: 'organizer_name' },
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
      return this.editingId ? '编辑活动' : '发布活动';
    }
  },
  mounted() {
    this.fetchClasses();
    this.fetchData();
  },
  methods: {
    async fetchClasses() {
      const res = await api.classes.all();
      if (res.success) this.classes = res.data;
    },
    async fetchData() {
      this.loading = true;
      try {
        const res = await api.activities.list({
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
      this.searchForm = { classId: undefined };
      this.pagination.current = 1;
      this.fetchData();
    },
    viewDetail(id) {
      this.$router.push(`/activity/${id}`);
    },
    showModal(record = null) {
      this.editingId = record?.id || null;
      this.visible = true;
      this.$nextTick(() => {
        this.form.resetFields();
        if (record) {
          this.form.setFieldsValue({
            classId: record.class_id,
            title: record.title,
            activityDate: moment(record.activity_date),
            location: record.location,
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
            const data = {
              ...values,
              activityDate: moment(values.activityDate).format('YYYY-MM-DD')
            };
            let res;
            if (this.editingId) {
              res = await api.activities.update(this.editingId, data);
            } else {
              res = await api.activities.create(data);
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
      const res = await api.activities.delete(id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchData();
      }
    }
  }
};
</script>
