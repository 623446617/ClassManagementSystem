<template>
  <div class="page-container">
    <div class="search-form">
      <a-form layout="inline">
        <a-form-item label="考试">
          <a-select v-model="searchForm.examId" style="width: 200px" allowClear>
            <a-select-option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="科目">
          <a-select v-model="searchForm.subjectId" style="width: 120px" allowClear>
            <a-select-option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchData">查询</a-button>
          <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-row :gutter="24" style="margin-bottom: 24px" v-if="statistics.total_count">
      <a-col :span="6">
        <a-card><a-statistic title="参考人数" :value="statistics.total_count" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="平均分" :value="statistics.avg_score?.toFixed(1)" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="最高分" :value="statistics.max_score" :value-style="{ color: '#3f8600' }" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="最低分" :value="statistics.min_score" :value-style="{ color: '#cf1322' }" /></a-card>
      </a-col>
    </a-row>

    <div class="table-container">
      <div class="table-toolbar">
        <a-button type="primary" icon="plus" @click="showExamModal">创建考试</a-button>
        <a-button icon="edit" style="margin-left: 8px" @click="showGradeModal" :disabled="!searchForm.examId">录入成绩</a-button>
        <a-button icon="calculator" style="margin-left: 8px" @click="calculateRank" :disabled="!searchForm.examId">计算排名</a-button>
        <a-button icon="download" style="margin-left: 8px" @click="exportData" :disabled="!searchForm.examId">导出</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      >
        <span slot="score" slot-scope="text">
          <a-tag :color="getScoreColor(text)">{{ text }}</a-tag>
        </span>
      </a-table>
    </div>

    <a-modal
      title="创建考试"
      :visible="examVisible"
      :confirm-loading="examLoading"
      @ok="submitExam"
      @cancel="examVisible = false"
    >
      <a-form :form="examForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="考试名称">
          <a-input v-decorator="['name', { rules: [{ required: true }] }]" />
        </a-form-item>
        <a-form-item label="班级">
          <a-select v-decorator="['classId', { rules: [{ required: true }] }]">
            <a-select-option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="考试日期">
          <a-date-picker v-decorator="['examDate']" />
        </a-form-item>
        <a-form-item label="总分">
          <a-input-number v-decorator="['totalScore', { initialValue: 100 }]" :min="1" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      title="录入成绩"
      :visible="gradeVisible"
      :confirm-loading="gradeLoading"
      @ok="submitGrade"
      @cancel="gradeVisible = false"
      width="800px"
    >
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="科目">
          <a-select v-model="gradeSubjectId">
            <a-select-option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
      <a-table :columns="gradeColumns" :data-source="gradeStudents" row-key="id" size="small">
        <span slot="score" slot-scope="text, record">
          <a-input-number v-model="record.score" :min="0" :max="150" size="small" />
        </span>
        <span slot="comment" slot-scope="text, record">
          <a-input v-model="record.comment" size="small" />
        </span>
      </a-table>
    </a-modal>
  </div>
</template>

<script>
import api from '../../api';
import moment from 'moment';

export default {
  name: 'GradeList',
  data() {
    return {
      classes: [],
      subjects: [],
      exams: [],
      searchForm: { examId: undefined, subjectId: undefined },
      data: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
      statistics: {},
      columns: [
        { title: '排名', dataIndex: 'rank', width: 60 },
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'student_name' },
        { title: '考试', dataIndex: 'exam_name' },
        { title: '科目', dataIndex: 'subject_name' },
        { title: '分数', dataIndex: 'score', scopedSlots: { customRender: 'score' } },
        { title: '评语', dataIndex: 'comment', ellipsis: true }
      ],
      examVisible: false,
      examLoading: false,
      examForm: this.$form.createForm(this),
      gradeVisible: false,
      gradeLoading: false,
      gradeSubjectId: undefined,
      gradeStudents: [],
      gradeColumns: [
        { title: '学号', dataIndex: 'student_no' },
        { title: '姓名', dataIndex: 'name' },
        { title: '分数', dataIndex: 'score', scopedSlots: { customRender: 'score' } },
        { title: '评语', dataIndex: 'comment', scopedSlots: { customRender: 'comment' } }
      ]
    };
  },
  mounted() {
    this.fetchClasses();
    this.fetchSubjects();
    this.fetchExams();
  },
  methods: {
    async fetchClasses() {
      const res = await api.classes.all();
      if (res.success) this.classes = res.data;
    },
    async fetchSubjects() {
      const res = await api.grades.subjects();
      if (res.success) this.subjects = res.data;
    },
    async fetchExams() {
      const res = await api.grades.exams({ pageSize: 100 });
      if (res.success) this.exams = res.data.list;
    },
    async fetchData() {
      if (!this.searchForm.examId) return;
      this.loading = true;
      try {
        const res = await api.grades.list({
          page: this.pagination.current,
          pageSize: this.pagination.pageSize,
          ...this.searchForm
        });
        if (res.success) {
          this.data = res.data.list;
          this.pagination.total = res.data.total;
        }
        const statRes = await api.grades.statistics(this.searchForm.examId, { subjectId: this.searchForm.subjectId });
        if (statRes.success) {
          this.statistics = statRes.data;
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
      this.searchForm = { examId: undefined, subjectId: undefined };
      this.data = [];
      this.statistics = {};
    },
    showExamModal() {
      this.examVisible = true;
      this.$nextTick(() => this.examForm.resetFields());
    },
    async submitExam() {
      this.examForm.validateFields(async (err, values) => {
        if (!err) {
          this.examLoading = true;
          try {
            const data = {
              ...values,
              examDate: values.examDate ? moment(values.examDate).format('YYYY-MM-DD') : null
            };
            const res = await api.grades.createExam(data);
            if (res.success) {
              this.$message.success('创建成功');
              this.examVisible = false;
              this.fetchExams();
            }
          } finally {
            this.examLoading = false;
          }
        }
      });
    },
    async showGradeModal() {
      const exam = this.exams.find(e => e.id === this.searchForm.examId);
      if (!exam) return;
      const res = await api.students.list({ classId: exam.class_id, pageSize: 100 });
      if (res.success) {
        this.gradeStudents = res.data.list.map(s => ({ ...s, score: null, comment: '' }));
      }
      this.gradeSubjectId = this.subjects[0]?.id;
      this.gradeVisible = true;
    },
    async submitGrade() {
      if (!this.gradeSubjectId) {
        this.$message.error('请选择科目');
        return;
      }
      this.gradeLoading = true;
      try {
        const grades = this.gradeStudents.filter(s => s.score !== null).map(s => ({
          studentId: s.id,
          score: s.score,
          comment: s.comment
        }));
        const res = await api.grades.batch({
          examId: this.searchForm.examId,
          subjectId: this.gradeSubjectId,
          grades
        });
        if (res.success) {
          this.$message.success('录入成功');
          this.gradeVisible = false;
          this.fetchData();
        }
      } finally {
        this.gradeLoading = false;
      }
    },
    async calculateRank() {
      const res = await api.grades.calculateRank(this.searchForm.examId);
      if (res.success) {
        this.$message.success('排名计算完成');
        this.fetchData();
      }
    },
    exportData() {
      const csv = ['排名,学号,姓名,科目,分数,评语'];
      this.data.forEach(item => {
        csv.push(`${item.rank || ''},${item.student_no},${item.student_name},${item.subject_name},${item.score},${item.comment || ''}`);
      });
      const blob = new Blob(['\ufeff' + csv.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `成绩列表_${moment().format('YYYYMMDD')}.csv`;
      a.click();
    },
    getScoreColor(score) {
      if (score >= 90) return 'green';
      if (score >= 60) return 'blue';
      return 'red';
    }
  }
};
</script>
