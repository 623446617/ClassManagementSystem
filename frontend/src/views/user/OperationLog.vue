<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="用户">
          <a-input v-model="searchForm.userId" placeholder="用户ID" allowClear />
        </a-form-item>
        <a-form-item label="日期范围">
          <a-range-picker v-model="dateRange" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchData">查询</a-button>
          <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
        </a-form-item>
      </a-form>
    </div>

    <div class="table-container">
      <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      />
    </div>
  </div>
</template>

<script>
import api from '../../api';
import moment from 'moment';

export default {
  name: 'OperationLog',
  data() {
    return {
      searchForm: { userId: undefined },
      dateRange: [],
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 20, total: 0 },
      columns: [
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '用户', dataIndex: 'real_name' },
        { title: '操作', dataIndex: 'operation' },
        { title: 'IP地址', dataIndex: 'ip' },
        { title: '操作时间', dataIndex: 'created_at' }
      ]
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.current,
          pageSize: this.pagination.pageSize,
          ...this.searchForm
        };
        if (this.dateRange.length === 2) {
          params.startDate = moment(this.dateRange[0]).format('YYYY-MM-DD');
          params.endDate = moment(this.dateRange[1]).format('YYYY-MM-DD');
        }
        const res = await api.logs.list(params);
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
      this.searchForm = { userId: undefined };
      this.dateRange = [];
      this.pagination.current = 1;
      this.fetchData();
    }
  }
};
</script>
