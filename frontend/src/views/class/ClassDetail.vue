<template>
  <div class="page-container">
    <a-page-header
      :title="classInfo.name"
      :sub-title="classInfo.grade"
      @back="() => $router.back()"
    >
      <a-descriptions :column="3" slot="extra">
        <a-descriptions-item label="班主任">{{ classInfo.teacher_name || '未指定' }}</a-descriptions-item>
        <a-descriptions-item label="学生人数">{{ classInfo.student_count }}</a-descriptions-item>
      </a-descriptions>
    </a-page-header>

    <a-tabs default-active-key="announcement">
      <a-tab-pane key="announcement" tab="班级公告">
        <div class="tab-content">
          <div class="table-toolbar">
            <a-button type="primary" icon="plus" @click="showAnnouncementModal()">发布公告</a-button>
          </div>
          <a-list :data-source="announcements" :loading="announcementLoading">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta :description="item.created_at">
                <span slot="title">{{ item.title }}</span>
                <span slot="description">发布人: {{ item.publisher_name }} | {{ item.created_at }}</span>
              </a-list-item-meta>
              <div>{{ item.content }}</div>
              <a slot="actions" @click="deleteAnnouncement(item.id)">删除</a>
            </a-list-item>
          </a-list>
        </div>
      </a-tab-pane>
      <a-tab-pane key="honor" tab="班级荣誉">
        <div class="tab-content">
          <div class="table-toolbar">
            <a-button type="primary" icon="plus" @click="showHonorModal()">添加荣誉</a-button>
          </div>
          <a-list :data-source="honors" :loading="honorLoading">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta>
                <span slot="title">{{ item.title }}</span>
                <span slot="description">获奖日期: {{ item.award_date }}</span>
              </a-list-item-meta>
              <div>{{ item.description }}</div>
              <a slot="actions" @click="deleteHonor(item.id)">删除</a>
            </a-list-item>
          </a-list>
        </div>
      </a-tab-pane>
      <a-tab-pane key="album" tab="班级相册">
        <div class="tab-content">
          <div class="table-toolbar">
            <a-button type="primary" icon="plus" @click="showAlbumModal()">上传照片</a-button>
          </div>
          <div class="photo-grid">
            <div v-for="item in albums" :key="item.id" class="photo-item">
              <img :src="item.image_path" :alt="item.title" />
              <div class="photo-overlay">
                <span>{{ item.title }}</span>
                <a @click="deleteAlbum(item.id)">删除</a>
              </div>
            </div>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      title="发布公告"
      :visible="announcementVisible"
      :confirm-loading="announcementConfirmLoading"
      @ok="submitAnnouncement"
      @cancel="announcementVisible = false"
    >
      <a-form :form="announcementForm" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="标题">
          <a-input v-decorator="['title', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="内容">
          <a-textarea v-decorator="['content', { rules: [{ required: true }] }]" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      title="添加荣誉"
      :visible="honorVisible"
      :confirm-loading="honorConfirmLoading"
      @ok="submitHonor"
      @cancel="honorVisible = false"
    >
      <a-form :form="honorForm" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="荣誉名称">
          <a-input v-decorator="['title', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="获奖日期">
          <a-date-picker v-decorator="['awardDate', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-decorator="['description']" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      title="上传照片"
      :visible="albumVisible"
      :confirm-loading="albumConfirmLoading"
      @ok="submitAlbum"
      @cancel="albumVisible = false"
    >
      <a-form :form="albumForm" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="标题">
          <a-input v-decorator="['title', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-decorator="['description']" :rows="2" />
        </a-form-item>
        <a-form-item label="图片">
          <a-input v-decorator="['imagePath', { rules: [{ required: true }] }]" placeholder="图片URL" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';
import moment from 'moment';

export default {
  name: 'ClassDetail',
  data() {
    return {
      classId: this.$route.params.id,
      classInfo: {},
      announcements: [],
      honors: [],
      albums: [],
      announcementLoading: false,
      honorLoading: false,
      announcementVisible: false,
      honorVisible: false,
      albumVisible: false,
      announcementConfirmLoading: false,
      honorConfirmLoading: false,
      albumConfirmLoading: false,
      announcementForm: this.$form.createForm(this),
      honorForm: this.$form.createForm(this),
      albumForm: this.$form.createForm(this)
    };
  },
  mounted() {
    this.fetchClassInfo();
    this.fetchAnnouncements();
    this.fetchHonors();
    this.fetchAlbums();
  },
  methods: {
    async fetchClassInfo() {
      const res = await api.classes.get(this.classId);
      if (res.success) {
        this.classInfo = res.data;
      }
    },
    async fetchAnnouncements() {
      this.announcementLoading = true;
      try {
        const res = await api.classes.announcements(this.classId, { pageSize: 20 });
        if (res.success) {
          this.announcements = res.data.list;
        }
      } finally {
        this.announcementLoading = false;
      }
    },
    async fetchHonors() {
      this.honorLoading = true;
      try {
        const res = await api.classes.honors(this.classId);
        if (res.success) {
          this.honors = res.data;
        }
      } finally {
        this.honorLoading = false;
      }
    },
    async fetchAlbums() {
      const res = await api.classes.albums(this.classId);
      if (res.success) {
        this.albums = res.data;
      }
    },
    showAnnouncementModal() {
      this.announcementVisible = true;
      this.$nextTick(() => {
        this.announcementForm.resetFields();
      });
    },
    async submitAnnouncement() {
      this.announcementForm.validateFields(async (err, values) => {
        if (!err) {
          this.announcementConfirmLoading = true;
          try {
            const res = await api.classes.createAnnouncement(this.classId, values);
            if (res.success) {
              this.$message.success('发布成功');
              this.announcementVisible = false;
              this.fetchAnnouncements();
            }
          } finally {
            this.announcementConfirmLoading = false;
          }
        }
      });
    },
    async deleteAnnouncement(id) {
      const res = await api.classes.deleteAnnouncement(this.classId, id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchAnnouncements();
      }
    },
    showHonorModal() {
      this.honorVisible = true;
      this.$nextTick(() => {
        this.honorForm.resetFields();
      });
    },
    async submitHonor() {
      this.honorForm.validateFields(async (err, values) => {
        if (!err) {
          this.honorConfirmLoading = true;
          try {
            const data = {
              ...values,
              awardDate: moment(values.awardDate).format('YYYY-MM-DD')
            };
            const res = await api.classes.createHonor(this.classId, data);
            if (res.success) {
              this.$message.success('添加成功');
              this.honorVisible = false;
              this.fetchHonors();
            }
          } finally {
            this.honorConfirmLoading = false;
          }
        }
      });
    },
    async deleteHonor(id) {
      const res = await api.classes.deleteHonor(this.classId, id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchHonors();
      }
    },
    showAlbumModal() {
      this.albumVisible = true;
      this.$nextTick(() => {
        this.albumForm.resetFields();
      });
    },
    async submitAlbum() {
      this.albumForm.validateFields(async (err, values) => {
        if (!err) {
          this.albumConfirmLoading = true;
          try {
            const res = await api.classes.createAlbum(this.classId, values);
            if (res.success) {
              this.$message.success('上传成功');
              this.albumVisible = false;
              this.fetchAlbums();
            }
          } finally {
            this.albumConfirmLoading = false;
          }
        }
      });
    },
    async deleteAlbum(id) {
      const res = await api.classes.deleteAlbum(this.classId, id);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchAlbums();
      }
    }
  }
};
</script>

<style lang="less" scoped>
.tab-content {
  padding: 24px;
  background: #fff;
  border-radius: 4px;
}
</style>
