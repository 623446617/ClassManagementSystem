import Vue from 'vue';
import VueRouter from 'vue-router';
import store from '../store';

Vue.use(VueRouter);

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页', icon: 'home' }
      },
      {
        path: 'user',
        name: 'User',
        component: () => import('../views/user/UserManage.vue'),
        meta: { title: '用户管理', icon: 'user', permission: 'admin' }
      },
      {
        path: 'role',
        name: 'Role',
        component: () => import('../views/user/RoleManage.vue'),
        meta: { title: '角色管理', icon: 'team', permission: 'admin' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/user/Profile.vue'),
        meta: { title: '个人中心' }
      },
      {
        path: 'log',
        name: 'OperationLog',
        component: () => import('../views/user/OperationLog.vue'),
        meta: { title: '操作日志', permission: 'admin' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/user/Settings.vue'),
        meta: { title: '系统设置', permission: 'admin' }
      },
      {
        path: 'class',
        name: 'ClassList',
        component: () => import('../views/class/ClassList.vue'),
        meta: { title: '班级管理', icon: 'appstore' }
      },
      {
        path: 'class/:id',
        name: 'ClassDetail',
        component: () => import('../views/class/ClassDetail.vue'),
        meta: { title: '班级详情', hidden: true }
      },
      {
        path: 'student',
        name: 'StudentList',
        component: () => import('../views/student/StudentList.vue'),
        meta: { title: '学生管理', icon: 'solution' }
      },
      {
        path: 'attendance',
        name: 'Attendance',
        component: () => import('../views/attendance/Attendance.vue'),
        meta: { title: '考勤管理', icon: 'calendar' }
      },
      {
        path: 'leave',
        name: 'LeaveRequest',
        component: () => import('../views/attendance/LeaveRequest.vue'),
        meta: { title: '请假管理', icon: 'file-text' }
      },
      {
        path: 'grade',
        name: 'GradeList',
        component: () => import('../views/grade/GradeList.vue'),
        meta: { title: '成绩管理', icon: 'line-chart' }
      },
      {
        path: 'homework',
        name: 'HomeworkList',
        component: () => import('../views/homework/HomeworkList.vue'),
        meta: { title: '作业管理', icon: 'edit' }
      },
      {
        path: 'homework/:id',
        name: 'HomeworkDetail',
        component: () => import('../views/homework/HomeworkDetail.vue'),
        meta: { title: '作业详情', hidden: true }
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('../views/schedule/Schedule.vue'),
        meta: { title: '课程表', icon: 'schedule' }
      },
      {
        path: 'reward',
        name: 'RewardList',
        component: () => import('../views/reward/RewardList.vue'),
        meta: { title: '奖惩管理', icon: 'trophy' }
      },
      {
        path: 'evaluation',
        name: 'EvaluationList',
        component: () => import('../views/reward/EvaluationList.vue'),
        meta: { title: '综合素质评价', icon: 'star' }
      },
      {
        path: 'activity',
        name: 'ActivityList',
        component: () => import('../views/activity/ActivityList.vue'),
        meta: { title: '班级活动', icon: 'picture' }
      },
      {
        path: 'activity/:id',
        name: 'ActivityDetail',
        component: () => import('../views/activity/ActivityDetail.vue'),
        meta: { title: '活动详情', hidden: true }
      }
    ]
  },
  {
    path: '*',
    redirect: '/dashboard'
  }
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 班级管理系统` : '班级管理系统';
  
  const token = store.state.token;
  
  if (to.path !== '/login' && !token) {
    next('/login');
  } else if (to.path === '/login' && token) {
    next('/dashboard');
  } else {
    if (to.meta.permission && to.meta.permission !== store.state.user?.role) {
      if (store.state.user?.role !== 'admin') {
        next('/dashboard');
        return;
      }
    }
    next();
  }
});

export default router;
