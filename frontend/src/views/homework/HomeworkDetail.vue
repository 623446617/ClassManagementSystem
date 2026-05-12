<template>
  <div class="page-container">
    <a-page-header
      :title="homework.title"
      @back="() => $router.back()"
    >
      <a-descriptions :column="3" slot="extra">
        <a-descriptions-item label="班级">{{ homework.class_name }}</a-descriptions-item>
        <a-descriptions-item label="科目">{{ homework.subject_name }}</a-descriptions-item>
        <a-descriptions-item label="截止时间">{{ homework.deadline }}</a-descriptions-item>
      </a-descriptions>
    </a-page-header>

    <a-card title="作业内容" style="margin-bottom: 24px">
      <p>{{ homework.content }}</p>
    </a-card>

    <a-card title="提交情况">
      <a-tabs default-active-key="submitted">
        <a-tab-pane key="submitted" tab="已提交">
          <a-table :columns="submissionColumns" :data-source="submissions" :loading="submissionLoading" row-key="id">
            <span slot="status" slot-scope="text">
              <a-tag :color="text === '已批改' ? 'green' : 'blue'">{{ text }}</a-tag>
            </span>
            <span slot="action" slot-scope="text, record">
              <a @click="showGradeModal(record)">批改</a>
            </span>
          </a-table>
        </a-tab-pane>
        <a-tab-pane key="unsubmitted" tab="未提交">
          <a-table :columns="unsubmittedColumns" :data-source="unsubmitted" :loading="unsubmittedLoading" row-key="id" />
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      title="批改作业"
      :visible="gradeVisible"
      :confirm-loading="gradeLoading"
      @ok="submitGrade"
      @cancel="gradeVisible = false"
    >
      <a-form :form="gradeForm" :label-col="{ span: 5 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="学生">
          <span>{{ currentSubmission.student_name }}</span>
        </a-form-item>
        <a-form-item label="提交内容">
          <p>{{ currentSubmission.content || '无' }}</p>
        </a-form-item>
        <a-form-item label="分数">
          <a-input-number v-decorator="['score', { initialValue: currentSubmission.score }]" :min="0" :max="100" />
        </a-form-item>
        <a-form-item label="评语">
          <a-textarea v-decorator="['comment', { initialValue: currentSubmission.comment }]" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';

export default {
  name: 'HomeworkDetail',
  data() {
    return {
      homeworkId: this.$route.params.id,
      homework: {},
      submissions: [],
      unsubmitted: [],
      submissionLoading: false,
      unsubmittedLoading: false,
      submissionColumns: [
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'student_name' },
        { title: '提交时间', dataIndex: 'submit_time' },
        { title: '分数', dataIndex: 'score' },
        { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' } },
        { title: '操作', dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 80 }
      ],
      unsubmittedColumns: [
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'name' }
      ],
      gradeVisible: false,
      gradeLoading: false,
      currentSubmission: {},
      gradeForm: this.$form.createForm(this)
    };
  },
  mounted() {
    this.fetchHomework();
    this.fetchSubmissions();
    this.fetchUnsubmitted();
  },
  methods: {
    async fetchHomework() {
      const res = await api.homework.get(this.homeworkId);
      if (res.success) {
        this.homework = res.data;
      }
    },
    async fetchSubmissions() {
      this.submissionLoading = true;
      try {
        const res = await api.homework.submissions(this.homeworkId, { pageSize: 100 });
        if (res.success) {
          this.submissions = res.data.list;
        }
      } finally {
        this.submissionLoading = false;
      }
    },
    async fetchUnsubmitted() {
      this.unsubmittedLoading = true;
      try {
        const res = await api.homework.unsubmitted(this.homeworkId);
        if (res.success) {
          this.unsubmitted = res.data;
        }
      } finally {
        this.unsubmittedLoading = false;
      }
    },
    showGradeModal(record) {
      this.currentSubmission = record;
      this.gradeVisible = true;
      this.$nextTick(() => {
        this.gradeForm.setFieldsValue({
          score: record.score,
          comment: record.comment
        });
      });
    },
    async submitGrade() {
      this.gradeForm.validateFields(async (err, values) => {
        if (!err) {
          this.gradeLoading = true;
          try {
            const res = await api.homework.grade(this.currentSubmission.id, values);
            if (res.success) {
              this.$message.success('批改成功');
              this.gradeVisible = false;
              this.fetchSubmissions();
            }
          } finally {
            this.gradeLoading = false;
          }
        }
      });
    }
  }
};
</script>
