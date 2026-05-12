<template>
  <div class="page-container">
    <a-card title="系统设置">
      <a-form :form="form" :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="学校名称">
          <a-input v-decorator="['school_name']" />
        </a-form-item>
        <a-form-item label="当前学期">
          <a-input v-decorator="['semester']" />
        </a-form-item>
        <a-form-item label="最大文件大小">
          <a-input-number
            v-decorator="['max_file_size', { initialValue: 10485760 }]"
            :min="1048576"
            :max="104857600"
          />
          <span style="margin-left: 8px">字节</span>
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 4 }">
          <a-button type="primary" @click="handleSave">保存设置</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script>
import api from '../../api';

export default {
  name: 'Settings',
  data() {
    return {
      form: this.$form.createForm(this)
    };
  },
  mounted() {
    this.fetchSettings();
  },
  methods: {
    async fetchSettings() {
      const res = await api.settings.get();
      if (res.success) {
        this.$nextTick(() => {
          this.form.setFieldsValue({
            school_name: res.data.school_name,
            semester: res.data.semester,
            max_file_size: parseInt(res.data.max_file_size) || 10485760
          });
        });
      }
    },
    async handleSave() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          const res = await api.settings.update(values);
          if (res.success) {
            this.$message.success('保存成功');
          }
        }
      });
    }
  }
};
</script>
