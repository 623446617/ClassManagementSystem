<template>
  <a-layout class="main-layout">
    <a-layout-sider v-model="collapsed" :trigger="null" collapsible>
      <div class="logo">
        <span v-if="!collapsed">班级管理系统</span>
        <span v-else>班级</span>
      </div>
      <a-menu
        theme="dark"
        mode="inline"
        :selected-keys="[selectedKey]"
        @click="handleMenuClick"
      >
        <a-menu-item key="/dashboard">
          <a-icon type="home" />
          <span>首页</span>
        </a-menu-item>
        <a-sub-menu v-if="isAdmin" key="system">
          <span slot="title"><a-icon type="setting" /><span>系统管理</span></span>
          <a-menu-item key="/user">用户管理</a-menu-item>
          <a-menu-item key="/role">角色管理</a-menu-item>
          <a-menu-item key="/log">操作日志</a-menu-item>
          <a-menu-item key="/settings">系统设置</a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="class-mgmt">
          <span slot="title"><a-icon type="appstore" /><span>班级管理</span></span>
          <a-menu-item key="/class">班级信息</a-menu-item>
          <a-menu-item key="/student">学生管理</a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="attendance-mgmt">
          <span slot="title"><a-icon type="calendar" /><span>考勤管理</span></span>
          <a-menu-item key="/attendance">考勤登记</a-menu-item>
          <a-menu-item key="/leave">请假管理</a-menu-item>
        </a-sub-menu>
        <a-menu-item key="/grade">
          <a-icon type="line-chart" />
          <span>成绩管理</span>
        </a-menu-item>
        <a-menu-item key="/homework">
          <a-icon type="edit" />
          <span>作业管理</span>
        </a-menu-item>
        <a-menu-item key="/schedule">
          <a-icon type="schedule" />
          <span>课程表</span>
        </a-menu-item>
        <a-sub-menu key="evaluation-mgmt">
          <span slot="title"><a-icon type="star" /><span>评价管理</span></span>
          <a-menu-item key="/reward">奖惩记录</a-menu-item>
          <a-menu-item key="/evaluation">综合评价</a-menu-item>
        </a-sub-menu>
        <a-menu-item key="/activity">
          <a-icon type="picture" />
          <span>班级活动</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <a-icon
          class="trigger"
          :type="collapsed ? 'menu-unfold' : 'menu-fold'"
          @click="collapsed = !collapsed"
        />
        <div class="header-right">
          <a-dropdown>
            <span class="user-info">
              <a-avatar :src="userAvatar" icon="user" />
              <span class="user-name">{{ userName }}</span>
            </span>
            <a-menu slot="overlay">
              <a-menu-item @click="$router.push('/profile')">
                <a-icon type="user" />个人中心
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item @click="handleLogout">
                <a-icon type="logout" />退出登录
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'MainLayout',
  data() {
    return {
      collapsed: false
    };
  },
  computed: {
    ...mapGetters(['userName', 'userRole']),
    selectedKey() {
      return this.$route.path;
    },
    isAdmin() {
      return this.userRole === 'admin';
    },
    userAvatar() {
      return this.$store.state.user?.avatar;
    }
  },
  methods: {
    ...mapActions(['logout']),
    handleMenuClick({ key }) {
      this.$router.push(key);
    },
    handleLogout() {
      this.$confirm({
        title: '确认退出',
        content: '确定要退出登录吗？',
        onOk: async () => {
          await this.logout();
          this.$router.push('/login');
        }
      });
    }
  }
};
</script>

<style lang="less" scoped>
.main-layout {
  height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.1);
}

.header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.trigger {
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
  
  &:hover {
    color: #1890ff;
  }
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.user-name {
  margin-left: 8px;
}

.content {
  margin: 0;
  overflow: auto;
}
</style>
