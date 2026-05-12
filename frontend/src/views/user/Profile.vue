<template>
  <div class="page-container">
    <a-card title="个人中心">
      <a-row :gutter="24">
        <a-col :span="8">
          <div style="text-align: center; padding: 24px">
            <a-avatar :size="100" :src="userInfo.avatar" icon="user" />
            <h3 style="margin-top: 16px">{{ userInfo.real_name }}</h3>
            <a-tag :color="getRoleColor(userInfo.role)">{{ getRoleName(userInfo.role) }}</a-tag>
          </div>
        </a-col>
        <a-col :span="16">
          <a-tabs default-active-key="info">
            <a-tab-pane key="info" tab="基本信息">
              <a-form :form="form" :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
                <a-form-item label="用户名">
                  <a-input :value="userInfo.username" disabled />
                </a-form-item>
                <a-form-item label="姓名">
                  <a-input
                    v-decorator="['real_name', { initialValue: userInfo.real_name, rules: [{ required: true }] }]"
                  />
                </a-form-item>
                <a-form-item label="手机号">
                  <a-input v-decorator="['phone', { initialValue: userInfo.phone }]" />
                </a-form-item>
                <a-form-item label="邮箱">
                  <a-input v-decorator="['email', { initialValue: userInfo.email }]" />
                </a-form-item>
                <a-form-item :wrapper-col="{ offset: 4 }">
                  <a-button type="primary" @click="updateProfile">保存修改</a-button>
                </a-form-item>
              </a-form>
            </a-tab-pane>
            <a-tab-pane key="password" tab="修改密码">
              <a-form :form="passwordForm" :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
                <a-form-item label="原密码">
                  <a-input-password
                    v-decorator="['oldPassword', { rules: [{ required: true, message: '请输入原密码' }] }]"
                  />
                </a-form-item>
                <a-form-item label="新密码">
                  <a-input-password
                    v-decorator="['newPassword', { rules: [{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }] }]"
                  />
                </a-form-item>
                <a-form-item label="确认密码">
                  <a-input-password
                    v-decorator="['confirmPassword', { rules: [{ required: true, message: '请确认密码' }, { validator: validateConfirmPassword }] }]"
                  />
                </a-form-item>
                <a-form-item :wrapper-col="{ offset: 4 }">
                  <a-button type="primary" @click="changePassword">修改密码</a-button>
                </a-form-item>
              </a-form>
            </a-tab-pane>
          </a-tabs>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script>
import api from '../../api';
import { mapMutations } from 'vuex';

export default {
  name: 'Profile',
  data() {
    return {
      userInfo: {},
      form: this.$form.createForm(this),
      passwordForm: this.$form.createForm(this)
    };
  },
  mounted() {
    this.fetchProfile();
  },
  methods: {
    ...mapMutations(['SET_USER']),
    async fetchProfile() {
      const res = await api.auth.getProfile();
      if (res.success) {
        this.userInfo = res.data;
      }
    },
    async updateProfile() {
      this.form.validateFields(async (err, values) => {
        if (!err) {
          const res = await api.auth.updateProfile(values);
          if (res.success) {
            this.$message.success('保存成功');
            this.userInfo.real_name = values.real_name;
            this.userInfo.phone = values.phone;
            this.userInfo.email = values.email;
            this.SET_USER({ ...this.$store.state.user, realName: values.real_name });
          }
        }
      });
    },
    async changePassword() {
      this.passwordForm.validateFields(async (err, values) => {
        if (!err) {
          const res = await api.auth.changePassword({
            oldPassword: values.oldPassword,
            newPassword: values.newPassword
          });
          if (res.success) {
            this.$message.success('密码修改成功');
            this.passwordForm.resetFields();
          }
        }
      });
    },
    validateConfirmPassword(rule, value, callback) {
      const newPassword = this.passwordForm.getFieldValue('newPassword');
      if (value !== newPassword) {
        callback(new Error('两次密码不一致'));
      } else {
        callback();
      }
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
