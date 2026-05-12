<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>班级管理系统</h1>
        <p>Class Management System</p>
      </div>
      <a-form
        :form="form"
        @submit="handleSubmit"
        class="login-form"
      >
        <a-form-item>
          <a-input
            v-decorator="[
              'username',
              { rules: [{ required: true, message: '请输入用户名' }] }
            ]"
            placeholder="用户名"
            size="large"
          >
            <a-icon slot="prefix" type="user" />
          </a-input>
        </a-form-item>
        <a-form-item>
          <a-input-password
            v-decorator="[
              'password',
              { rules: [{ required: true, message: '请输入密码' }] }
            ]"
            placeholder="密码"
            size="large"
          >
            <a-icon slot="prefix" type="lock" />
          </a-input-password>
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="loading"
            size="large"
            block
          >
            登录
          </a-button>
        </a-form-item>
      </a-form>
      <div class="login-tips">
        <p>默认管理员账号: admin / admin123</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  name: 'Login',
  data() {
    return {
      loading: false
    };
  },
  beforeCreate() {
    this.form = this.$form.createForm(this);
  },
  methods: {
    ...mapActions(['login']),
    handleSubmit(e) {
      e.preventDefault();
      this.form.validateFields(async (err, values) => {
        if (!err) {
          this.loading = true;
          try {
            const res = await this.login(values);
            if (res.success) {
              this.$message.success('登录成功');
              this.$router.push('/dashboard');
            } else {
              this.$message.error(res.message || '登录失败');
            }
          } catch (error) {
            this.$message.error('登录失败');
          } finally {
            this.loading = false;
          }
        }
      });
    }
  }
};
</script>

<style lang="less" scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
  
  h1 {
    font-size: 28px;
    color: #333;
    margin-bottom: 8px;
  }
  
  p {
    color: #999;
    font-size: 14px;
  }
}

.login-form {
  .ant-input-affix-wrapper {
    height: 44px;
  }
  
  .ant-btn {
    height: 44px;
    font-size: 16px;
  }
}

.login-tips {
  text-align: center;
  margin-top: 24px;
  color: #999;
  font-size: 12px;
}
</style>
