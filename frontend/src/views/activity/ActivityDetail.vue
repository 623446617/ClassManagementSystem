<template>
  <div class="page-container">
    <a-page-header
      :title="activity.title"
      @back="() => $router.back()"
    >
      <a-descriptions :column="3" slot="extra">
        <a-descriptions-item label="班级">{{ activity.class_name }}</a-descriptions-item>
        <a-descriptions-item label="活动日期">{{ activity.activity_date }}</a-descriptions-item>
        <a-descriptions-item label="活动地点">{{ activity.location }}</a-descriptions-item>
      </a-descriptions>
    </a-page-header>

    <a-card title="活动描述" style="margin-bottom: 24px">
      <p>{{ activity.description || '暂无描述' }}</p>
    </a-card>

    <a-card title="活动照片">
      <div class="table-toolbar">
        <a-button type="primary" icon="plus" @click="showUploadModal">上传照片</a-button>
      </div>
      <div class="photo-grid" v-if="photos.length > 0">
        <div v-for="photo in photos" :key="photo.id" class="photo-item">
          <img :src="photo.image_path" :alt="photo.description" />
          <div class="photo-overlay">
            <span>{{ photo.description || '活动照片' }}</span>
            <a @click="deletePhoto(photo.id)">删除</a>
          </div>
        </div>
      </div>
      <a-empty v-else description="暂无照片" />
    </a-card>

    <a-modal
      title="上传照片"
      :visible="uploadVisible"
      :confirm-loading="uploadLoading"
      @ok="submitUpload"
      @cancel="uploadVisible = false"
    >
      <a-form :form="uploadForm" :label-col="{ span: 5 }" :wrapper-col="{ span: 17 }">
        <a-form-item label="照片描述">
          <a-input v-decorator="['description']" />
        </a-form-item>
        <a-form-item label="图片URL">
          <a-input v-decorator="['photoUrl', { rules: [{ required: true }] }]" placeholder="请输入图片URL" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';

export default {
  name: 'ActivityDetail',
  data() {
    return {
      activityId: this.$route.params.id,
      activity: {},
      photos: [],
      uploadVisible: false,
      uploadLoading: false,
      uploadForm: this.$form.createForm(this)
    };
  },
  mounted() {
    this.fetchActivity();
  },
  methods: {
    async fetchActivity() {
      const res = await api.activities.get(this.activityId);
      if (res.success) {
        this.activity = res.data;
        this.photos = res.data.photos || [];
      }
    },
    showUploadModal() {
      this.uploadVisible = true;
      this.$nextTick(() => this.uploadForm.resetFields());
    },
    async submitUpload() {
      this.uploadForm.validateFields(async (err, values) => {
        if (!err) {
          this.uploadLoading = true;
          try {
            const res = await api.activities.uploadPhoto(this.activityId, {
              description: values.description,
              imagePath: values.photoUrl
            });
            if (res.success) {
              this.$message.success('上传成功');
              this.uploadVisible = false;
              this.fetchActivity();
            }
          } finally {
            this.uploadLoading = false;
          }
        }
      });
    },
    async deletePhoto(photoId) {
      const res = await api.activities.deletePhoto(this.activityId, photoId);
      if (res.success) {
        this.$message.success('删除成功');
        this.fetchActivity();
      }
    }
  }
};
</script>

<style lang="less" scoped>
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
