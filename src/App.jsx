import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus, Trash2, Printer, Save, FileText, Users, Calculator, Settings,
    GripVertical, RefreshCw, Lock, Clipboard, X, ChevronRight, Download,
    AlertCircle, AlertTriangle, HelpCircle
} from 'lucide-react';

// ===== Constants =====
const NEW_CLASS_NAMES = ['가', '나', '다', '라', '마', '바', '사', '아', '자'];

// Pastel colors for original classes (1-9반)
const CLASS_COLORS = [
    { bg: 'var(--class-1)', dark: 'var(--class-1-dark)', name: '1반' },
    { bg: 'var(--class-2)', dark: 'var(--class-2-dark)', name: '2반' },
    { bg: 'var(--class-3)', dark: 'var(--class-3-dark)', name: '3반' },
    { bg: 'var(--class-4)', dark: 'var(--class-4-dark)', name: '4반' },
    { bg: 'var(--class-5)', dark: 'var(--class-5-dark)', name: '5반' },
    { bg: 'var(--class-6)', dark: 'var(--class-6-dark)', name: '6반' },
    { bg: 'var(--class-7)', dark: 'var(--class-7-dark)', name: '7반' },
    { bg: 'var(--class-8)', dark: 'var(--class-8-dark)', name: '8반' },
    { bg: 'var(--class-9)', dark: 'var(--class-9-dark)', name: '9반' },
];

const App = () => {
    // ===== State =====
    const [activeTab, setActiveTab] = useState('input');
    const [draggedStudentId, setDraggedStudentId] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    // Bulk Input Modal State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkTargetClass, setBulkTargetClass] = useState(1);

    // Delete Confirmation Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Logic Explanation Modal State
    const [showLogicModal, setShowLogicModal] = useState(false);

    // Configuration
    const [config, setConfig] = useState({
        year: 2025,
        grade: 1,
        totalCurrentClasses: 5, // 현재 반 수 (최대 9)
        totalNewClasses: 4, // 신 학년도 편성 반 수
        teacherName: '',
        assignmentMethod: 'staggered', // staggered, simple, snake
    });

    // Active input class tab
    const [activeInputClass, setActiveInputClass] = useState(1);

    // Students data - includes originalClass field
    const [students, setStudents] = useState([]);

    // ===== LocalStorage Load/Save =====
    useEffect(() => {
        const savedData = localStorage.getItem('classAssignmentData_v3');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setConfig(parsed.config);
                setStudents(parsed.students.map(s => ({
                    ...s,
                    manualClass: s.manualClass || null,
                    originalClass: s.originalClass || 1
                })));
            } catch (e) {
                console.error("데이터 로드 실패", e);
            }
        }
    }, []);

    const saveData = () => {
        localStorage.setItem('classAssignmentData_v3', JSON.stringify({ config, students }));
        alert('데이터가 브라우저에 저장되었습니다.');
    };

    const clearAllData = () => {
        localStorage.removeItem('classAssignmentData_v3');
        setStudents([]);
        setConfig({
            year: 2025,
            grade: 1,
            totalCurrentClasses: 5,
            totalNewClasses: 4,
            teacherName: '',
            assignmentMethod: 'staggered',
        });
        setActiveInputClass(1);
        setShowDeleteModal(false);
        alert('모든 데이터가 삭제되었습니다.');
    };

    // ===== Student CRUD =====
    const addStudent = (classNum) => {
        const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
        setStudents([...students, {
            id: newId,
            name: '',
            gender: 'M',
            rank: 0,
            note: '',
            isTransfer: false,
            manualClass: null,
            originalClass: classNum
        }]);
    };

    const removeStudent = (id) => {
        setStudents(students.filter(s => s.id !== id));
    };

    const updateStudent = (id, field, value) => {
        setStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const resetManualAssignments = () => {
        if (window.confirm('수동으로 이동한 내역을 모두 초기화하고 자동 배정으로 되돌리시겠습니까?')) {
            setStudents(students.map(s => ({ ...s, manualClass: null })));
        }
    };

    // ===== Bulk Input =====
    const handleBulkSubmit = () => {
        if (!bulkText.trim()) return;

        const rows = bulkText.trim().split(/\r?\n/);
        let maxId = students.length > 0 ? Math.max(...students.map(s => s.id)) : 0;
        let addedCount = 0;

        const newStudents = rows.map((row) => {
            const cols = row.replace(/[\t,]/g, ' ').trim().split(/\s+/);

            if (cols.length < 1 || !cols[0] || cols[0] === '이름' || cols[0] === '성명' || cols[0] === '번호') return null;

            // Check if first column is a number (학번), skip it
            let startIdx = 0;
            if (/^\d+$/.test(cols[0]) && cols.length > 1) {
                startIdx = 1;
            }

            const name = cols[startIdx];
            if (!name) return null;

            const genderRaw = cols[startIdx + 1] || '';
            const rankRaw = cols[startIdx + 2] || '0';
            const note = cols.slice(startIdx + 3).join(' ');

            let gender = 'M';
            if (['여', '여자', '여학생', 'F', 'f', 'Female'].some(k => genderRaw.includes(k))) {
                gender = 'F';
            }

            const rank = parseInt(rankRaw.replace(/[^0-9]/g, '')) || 0;

            addedCount++;
            return {
                id: maxId + addedCount,
                name,
                gender,
                rank,
                note,
                isTransfer: false,
                manualClass: null,
                originalClass: bulkTargetClass
            };
        }).filter(s => s !== null);

        if (newStudents.length > 0) {
            if (window.confirm(`${bulkTargetClass}반에 총 ${newStudents.length}명의 학생을 추가하시겠습니까?`)) {
                setStudents([...students, ...newStudents]);
                setShowBulkModal(false);
                setBulkText('');
                setActiveInputClass(bulkTargetClass);
            }
        } else {
            alert('데이터를 인식하지 못했습니다.\n입력 내용을 확인해주세요.');
        }
    };

    // ===== Core Logic: Class Assignment =====
    const processedData = useMemo(() => {
        // Group students by original class first
        const classGroups = {};
        for (let i = 1; i <= config.totalCurrentClasses; i++) {
            classGroups[i] = { boys: [], girls: [] };
        }

        students.forEach(s => {
            const classIdx = s.originalClass;
            if (classGroups[classIdx]) {
                if (s.gender === 'M') {
                    classGroups[classIdx].boys.push(s);
                } else {
                    classGroups[classIdx].girls.push(s);
                }
            }
        });

        // Sort function
        const sortFn = (a, b) => {
            if (a.isTransfer && !b.isTransfer) return 1;
            if (!a.isTransfer && b.isTransfer) return -1;
            if (a.rank !== b.rank) return a.rank - b.rank;
            return a.name.localeCompare(b.name);
        };

        // Assign classes using round-robin per original class
        const allAssigned = [];

        // Process each original class
        for (let classNum = 1; classNum <= config.totalCurrentClasses; classNum++) {
            const { boys, girls } = classGroups[classNum];
            boys.sort(sortFn);
            girls.sort(sortFn);

            // Calculate start indexes based on assignment method
            let boyStartIdx, girlStartIdx;

            switch (config.assignmentMethod) {
                case 'simple':
                    // Simple: Everyone starts from 0 (가)
                    boyStartIdx = 0;
                    girlStartIdx = 0;
                    break;
                case 'snake':
                    // Snake: Alternating direction per original class
                    boyStartIdx = (classNum - 1) % config.totalNewClasses;
                    girlStartIdx = (classNum - 1) % config.totalNewClasses;
                    break;
                case 'staggered':
                default:
                    // Staggered (Default): Boys and girls start differently
                    boyStartIdx = (classNum - 1) % config.totalNewClasses;
                    girlStartIdx = classNum % config.totalNewClasses;
                    break;
            }

            boys.forEach((student, index) => {
                let targetClassIdx;
                if (config.assignmentMethod === 'snake' && classNum % 2 === 0) {
                    // Snake: reverse direction for even classes
                    targetClassIdx = (config.totalNewClasses - 1 - ((boyStartIdx + index) % config.totalNewClasses));
                } else {
                    targetClassIdx = (boyStartIdx + index) % config.totalNewClasses;
                }
                const autoClass = NEW_CLASS_NAMES[targetClassIdx];
                allAssigned.push({
                    ...student,
                    newClass: student.manualClass || autoClass,
                    autoClass,
                    isManual: !!student.manualClass
                });
            });

            girls.forEach((student, index) => {
                let targetClassIdx;
                if (config.assignmentMethod === 'snake' && classNum % 2 === 0) {
                    // Snake: reverse direction for even classes
                    targetClassIdx = (config.totalNewClasses - 1 - ((girlStartIdx + index) % config.totalNewClasses));
                } else {
                    targetClassIdx = (girlStartIdx + index) % config.totalNewClasses;
                }
                const autoClass = NEW_CLASS_NAMES[targetClassIdx];
                allAssigned.push({
                    ...student,
                    newClass: student.manualClass || autoClass,
                    autoClass,
                    isManual: !!student.manualClass
                });
            });
        }

        // Calculate statistics for new classes
        const stats = {};
        NEW_CLASS_NAMES.slice(0, config.totalNewClasses).forEach(c => {
            stats[c] = { M: 0, F: 0, total: 0, transfer: 0, byOriginalClass: {} };
            for (let i = 1; i <= config.totalCurrentClasses; i++) {
                stats[c].byOriginalClass[i] = 0;
            }
        });

        allAssigned.forEach(s => {
            if (stats[s.newClass]) {
                if (s.gender === 'M') stats[s.newClass].M++;
                else stats[s.newClass].F++;
                stats[s.newClass].total++;
                if (s.isTransfer) stats[s.newClass].transfer++;
                stats[s.newClass].byOriginalClass[s.originalClass]++;
            }
        });

        // Separate by gender for display
        const assignedBoys = allAssigned.filter(s => s.gender === 'M');
        const assignedGirls = allAssigned.filter(s => s.gender === 'F');

        return { assignedBoys, assignedGirls, allAssigned, stats };
    }, [students, config]);

    // Get students for current input tab
    const currentClassStudents = useMemo(() => {
        return students.filter(s => s.originalClass === activeInputClass);
    }, [students, activeInputClass]);

    // Get student counts per class
    const studentCounts = useMemo(() => {
        const counts = {};
        for (let i = 1; i <= 9; i++) {
            counts[i] = students.filter(s => s.originalClass === i).length;
        }
        return counts;
    }, [students]);

    // ===== Drag & Drop =====
    const handleDragStart = (e, studentId) => {
        setDraggedStudentId(studentId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, className) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverColumn(className);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e, targetClass) => {
        e.preventDefault();
        setDragOverColumn(null);
        if (draggedStudentId) {
            updateStudent(draggedStudentId, 'manualClass', targetClass);
            setDraggedStudentId(null);
        }
    };

    const handleDragEnd = () => {
        setDraggedStudentId(null);
        setDragOverColumn(null);
    };

    // ===== Print =====
    const handlePrint = () => {
        window.print();
    };

    // ===== Get class color =====
    const getClassColor = (classNum) => {
        return CLASS_COLORS[classNum - 1] || CLASS_COLORS[0];
    };

    // ===== Render =====
    return (
        <div className="min-h-screen" style={{ background: 'var(--gray-50)' }}>
            {/* Bulk Input Modal */}
            {showBulkModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                <Clipboard style={{ width: 20, height: 20, color: 'var(--primary-600)' }} />
                                엑셀 데이터 붙여넣기
                            </h3>
                            <button onClick={() => setShowBulkModal(false)} className="btn btn-secondary btn-sm">
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">대상 반 선택</label>
                                <select
                                    className="select"
                                    value={bulkTargetClass}
                                    onChange={(e) => setBulkTargetClass(parseInt(e.target.value))}
                                >
                                    {Array.from({ length: config.totalCurrentClasses }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}반</option>
                                    ))}
                                </select>
                            </div>

                            <div className="alert alert-info">
                                <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
                                <div>
                                    <strong>사용 방법:</strong><br />
                                    엑셀에서 <strong>[번호] [성명] [성별] [석차] [비고]</strong> 순서의 셀을 복사(Ctrl+C)하여 아래에 붙여넣기(Ctrl+V) 하세요.<br />
                                    <small style={{ opacity: 0.8 }}>※ 번호는 생략 가능, 성별은 '남/여' 또는 'M/F' 모두 인식</small>
                                </div>
                            </div>

                            <textarea
                                className="input"
                                style={{
                                    height: 200,
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    resize: 'vertical'
                                }}
                                placeholder={`예시:\n1\t홍길동\t남\t1\t반장\n2\t김영희\t여\t2\n3\t이철수\t남\t3\t다문화`}
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                            />
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setShowBulkModal(false)} className="btn btn-secondary">
                                취소
                            </button>
                            <button onClick={handleBulkSubmit} className="btn btn-success">
                                <Plus style={{ width: 16, height: 16 }} />
                                데이터 추가
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 450 }}>
                        <div className="modal-header" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                            <h3 style={{ color: '#dc2626' }}>
                                <AlertTriangle style={{ width: 20, height: 20 }} />
                                데이터 전체 삭제
                            </h3>
                            <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary btn-sm">
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="alert" style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#991b1b',
                                marginBottom: '1rem'
                            }}>
                                <AlertTriangle style={{ width: 20, height: 20, flexShrink: 0 }} />
                                <div>
                                    <strong>경고!</strong> 이 작업은 되돌릴 수 없습니다.
                                </div>
                            </div>

                            <p style={{ marginBottom: '1rem', color: 'var(--gray-700)' }}>
                                다음 데이터가 모두 <strong>영구적으로 삭제</strong>됩니다:
                            </p>
                            <ul style={{
                                marginLeft: '1.5rem',
                                marginBottom: '1rem',
                                color: 'var(--gray-600)',
                                lineHeight: 1.8
                            }}>
                                <li>전체 학생 데이터 ({students.length}명)</li>
                                <li>기본 설정 (학년, 반 수 등)</li>
                                <li>수동 배정 내역</li>
                            </ul>

                            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                                정말로 모든 데이터를 삭제하시겠습니까?
                            </p>
                        </div>

                        <div className="modal-footer" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                            <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">
                                취소
                            </button>
                            <button onClick={clearAllData} className="btn btn-danger">
                                <Trash2 style={{ width: 16, height: 16 }} />
                                전체 삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logic Explanation Modal */}
            {showLogicModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 650 }}>
                        <div className="modal-header">
                            <h3>
                                <HelpCircle style={{ width: 20, height: 20, color: 'var(--primary-600)' }} />
                                배정 로직 설명
                            </h3>
                            <button onClick={() => setShowLogicModal(false)} className="btn btn-secondary btn-sm">
                                <X style={{ width: 16, height: 16 }} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary-700)' }}>
                                    현재 선택된 방식: {config.assignmentMethod === 'staggered' ? '스태거드 (기본)' : config.assignmentMethod === 'simple' ? '단순 라운드로빈' : '스네이크'}
                                </h4>
                            </div>

                            {/* Staggered */}
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: config.assignmentMethod === 'staggered' ? 'var(--primary-50)' : 'var(--gray-50)', borderRadius: 'var(--radius)', border: config.assignmentMethod === 'staggered' ? '2px solid var(--primary-400)' : '1px solid var(--gray-200)' }}>
                                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    ✅ 스태거드 (Staggered) - 기본
                                </h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.75rem' }}>
                                    각 원래 반별로 <strong>남학생과 여학생의 시작점을 다르게</strong> 설정하여 분산도를 높입니다.
                                </p>
                                <div style={{ fontSize: '0.8125rem', background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace' }}>
                                    <div><strong>1반:</strong> 남→가나다라, 여→나다라가</div>
                                    <div><strong>2반:</strong> 남→나다라가, 여→다라가나</div>
                                    <div><strong>3반:</strong> 남→다라가나, 여→라가나다</div>
                                    <div><strong>4반:</strong> 남→라가나다, 여→가나다라</div>
                                    <div><strong>5반:</strong> 남→가나다라, 여→나다라가 (반복)</div>
                                </div>
                            </div>

                            {/* Simple */}
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: config.assignmentMethod === 'simple' ? 'var(--primary-50)' : 'var(--gray-50)', borderRadius: 'var(--radius)', border: config.assignmentMethod === 'simple' ? '2px solid var(--primary-400)' : '1px solid var(--gray-200)' }}>
                                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    단순 라운드로빈 (Simple)
                                </h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.75rem' }}>
                                    모든 반, 모든 성별이 <strong>동일한 시작점(가)</strong>에서 순차적으로 배정됩니다.
                                </p>
                                <div style={{ fontSize: '0.8125rem', background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace' }}>
                                    <div><strong>모든 반:</strong> 1등→가, 2등→나, 3등→다, 4등→라, 5등→가...</div>
                                </div>
                            </div>

                            {/* Snake */}
                            <div style={{ marginBottom: '1rem', padding: '1rem', background: config.assignmentMethod === 'snake' ? 'var(--primary-50)' : 'var(--gray-50)', borderRadius: 'var(--radius)', border: config.assignmentMethod === 'snake' ? '2px solid var(--primary-400)' : '1px solid var(--gray-200)' }}>
                                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    스네이크 (Snake)
                                </h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.75rem' }}>
                                    홀수 반은 정방향, 짝수 반은 <strong>역방향</strong>으로 배정하여 각 학급의 성적 균형을 맞춥니다.
                                </p>
                                <div style={{ fontSize: '0.8125rem', background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace' }}>
                                    <div><strong>1반:</strong> 1등→가, 2등→나, 3등→다, 4등→라</div>
                                    <div><strong>2반:</strong> 1등→<span style={{ color: 'var(--primary-600)' }}>라</span>, 2등→<span style={{ color: 'var(--primary-600)' }}>다</span>, 3등→<span style={{ color: 'var(--primary-600)' }}>나</span>, 4등→<span style={{ color: 'var(--primary-600)' }}>가</span> (역방향)</div>
                                    <div><strong>3반:</strong> 1등→다, 2등→라, 3등→가, 4등→나</div>
                                </div>
                            </div>

                            <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                                <div style={{ fontSize: '0.8125rem' }}>
                                    <strong>공통 적용 규칙:</strong> 전출예정자는 항상 맨 뒤로 배정되고, 석차가 같으면 이름순으로 정렬됩니다.
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setShowLogicModal(false)} className="btn btn-primary">
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="app-header no-print">
                <div className="container app-header-content">
                    <div className="app-logo">
                        <Calculator style={{ width: 28, height: 28 }} />
                        <h1>{config.year + 1}학년도 분반 작업 도우미</h1>
                    </div>
                    <div className="app-actions">
                        <button onClick={() => setShowLogicModal(true)} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}>
                            <HelpCircle style={{ width: 16, height: 16 }} /> 로직설명
                        </button>
                        <button onClick={saveData} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}>
                            <Save style={{ width: 16, height: 16 }} /> 저장
                        </button>
                        <button onClick={() => setShowDeleteModal(true)} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: '#fca5a5', border: 'none' }}>
                            <Trash2 style={{ width: 16, height: 16 }} /> 삭제
                        </button>
                        <button onClick={handlePrint} className="btn" style={{ background: 'white', color: 'var(--primary-700)' }}>
                            <Printer style={{ width: 16, height: 16 }} /> 인쇄
                        </button>
                    </div>
                </div>
            </header>

            <main className="container" style={{ padding: '1.5rem 1rem' }}>
                {/* Settings Panel */}
                <section className="card no-print" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--gray-700)' }}>
                        <Settings style={{ width: 18, height: 18 }} /> 기본 설정
                    </h2>
                    <div className="settings-grid">
                        <div className="form-group">
                            <label className="form-label">현재 학년도</label>
                            <input
                                type="number"
                                className="input"
                                value={config.year}
                                onChange={(e) => setConfig({ ...config, year: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">현재 학년</label>
                            <select
                                className="select"
                                value={config.grade}
                                onChange={(e) => setConfig({ ...config, grade: parseInt(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}학년</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">현재 반 수</label>
                            <select
                                className="select"
                                value={config.totalCurrentClasses}
                                onChange={(e) => setConfig({ ...config, totalCurrentClasses: parseInt(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <option key={n} value={n}>{n}개 반</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">신학년도 반 수</label>
                            <select
                                className="select"
                                value={config.totalNewClasses}
                                onChange={(e) => setConfig({ ...config, totalNewClasses: parseInt(e.target.value) })}
                            >
                                {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                    <option key={n} value={n}>{n}학급 (가~{NEW_CLASS_NAMES[n - 1]})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">담임 성명</label>
                            <input
                                type="text"
                                className="input"
                                value={config.teacherName}
                                onChange={(e) => setConfig({ ...config, teacherName: e.target.value })}
                                placeholder="성명 입력"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">배정 방식</label>
                            <select
                                className="select"
                                value={config.assignmentMethod}
                                onChange={(e) => setConfig({ ...config, assignmentMethod: e.target.value })}
                            >
                                <option value="staggered">스태거드 (기본)</option>
                                <option value="simple">단순 라운드로빈</option>
                                <option value="snake">스네이크</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Tab Navigation */}
                <div className="tab-nav no-print">
                    <button
                        onClick={() => setActiveTab('input')}
                        className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
                    >
                        <Users style={{ width: 16, height: 16 }} />
                        <span>1. 학생 입력</span>
                        <ChevronRight style={{ width: 14, height: 14, opacity: 0.5 }} />
                    </button>
                    <button
                        onClick={() => setActiveTab('interactive')}
                        className={`tab-btn ${activeTab === 'interactive' ? 'active' : ''}`}
                    >
                        <RefreshCw style={{ width: 16, height: 16 }} />
                        <span>2. 전체 조정</span>
                        <ChevronRight style={{ width: 14, height: 14, opacity: 0.5 }} />
                    </button>
                    <button
                        onClick={() => setActiveTab('result')}
                        className={`tab-btn ${activeTab === 'result' ? 'active' : ''}`}
                    >
                        <FileText style={{ width: 16, height: 16 }} />
                        <span>3. 결과 출력</span>
                    </button>
                </div>

                {/* ============ Tab: Input ============ */}
                {activeTab === 'input' && (
                    <div className="card no-print animate-fade-in" style={{ padding: '1.5rem' }}>
                        {/* Class Tabs */}
                        <div className="class-tabs">
                            {Array.from({ length: config.totalCurrentClasses }, (_, i) => {
                                const classNum = i + 1;
                                const color = getClassColor(classNum);
                                const isActive = activeInputClass === classNum;
                                return (
                                    <button
                                        key={classNum}
                                        onClick={() => setActiveInputClass(classNum)}
                                        className={`class-tab ${isActive ? 'active' : ''}`}
                                        style={{
                                            background: isActive ? color.dark : color.bg,
                                            color: isActive ? 'white' : color.dark,
                                        }}
                                    >
                                        {classNum}반
                                        <span className="count-badge">{studentCounts[classNum]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                                {activeInputClass}반 학생 명부
                                <span style={{
                                    marginLeft: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 400,
                                    color: 'var(--gray-500)'
                                }}>
                                    (성적순 입력 권장)
                                </span>
                            </h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => {
                                        setBulkTargetClass(activeInputClass);
                                        setShowBulkModal(true);
                                    }}
                                    className="btn btn-success btn-sm"
                                >
                                    <Clipboard style={{ width: 14, height: 14 }} /> 엑셀 붙여넣기
                                </button>
                                <button
                                    onClick={() => addStudent(activeInputClass)}
                                    className="btn btn-secondary btn-sm"
                                >
                                    <Plus style={{ width: 14, height: 14 }} /> 1명 추가
                                </button>
                            </div>
                        </div>

                        {/* Student Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table className="student-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 50 }}>순번</th>
                                        <th>성명</th>
                                        <th style={{ width: 100, minWidth: 100 }}>성별</th>
                                        <th style={{ width: 80 }}>석차</th>
                                        <th style={{ width: 70 }}>전출</th>
                                        <th>비고 (특이사항)</th>
                                        <th style={{ width: 60 }}>삭제</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentClassStudents.map((student, idx) => (
                                        <tr key={student.id}>
                                            <td style={{ textAlign: 'center', color: 'var(--gray-500)' }}>{idx + 1}</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={student.name}
                                                    onChange={(e) => updateStudent(student.id, 'name', e.target.value)}
                                                    placeholder="이름"
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    className="select"
                                                    value={student.gender}
                                                    onChange={(e) => updateStudent(student.id, 'gender', e.target.value)}
                                                >
                                                    <option value="M">남</option>
                                                    <option value="F">여</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    value={student.rank}
                                                    onChange={(e) => updateStudent(student.id, 'rank', parseInt(e.target.value) || 0)}
                                                    style={{ textAlign: 'center' }}
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={student.isTransfer}
                                                    onChange={(e) => updateStudent(student.id, 'isTransfer', e.target.checked)}
                                                    style={{ width: 18, height: 18, accentColor: 'var(--primary-600)' }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={student.note}
                                                    onChange={(e) => updateStudent(student.id, 'note', e.target.value)}
                                                    placeholder="쌍생아, 학폭, 다문화 등"
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => removeStudent(student.id)}
                                                    className="btn btn-sm"
                                                    style={{ color: 'var(--gray-400)', padding: '0.25rem' }}
                                                    onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                                                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--gray-400)'}
                                                >
                                                    <Trash2 style={{ width: 16, height: 16 }} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentClassStudents.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                                                <div style={{ marginBottom: '0.5rem' }}>📝</div>
                                                {activeInputClass}반 학생 데이터가 없습니다.<br />
                                                <small>"엑셀 붙여넣기" 또는 "1명 추가" 버튼을 이용하세요.</small>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary */}
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: 'var(--gray-50)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.875rem',
                            color: 'var(--gray-600)',
                            display: 'flex',
                            gap: '1.5rem'
                        }}>
                            <span>전체: <strong>{students.length}명</strong></span>
                            <span style={{ color: 'var(--male-color)' }}>남: <strong>{students.filter(s => s.gender === 'M').length}명</strong></span>
                            <span style={{ color: 'var(--female-color)' }}>여: <strong>{students.filter(s => s.gender === 'F').length}명</strong></span>
                            <span>전출예정: <strong>{students.filter(s => s.isTransfer).length}명</strong></span>
                        </div>
                    </div>
                )}

                {/* ============ Tab: Interactive ============ */}
                {activeTab === 'interactive' && (
                    <div className="no-print animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                                    전체 반 조정 보드
                                </h2>
                                <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                                    학생 카드를 드래그하여 다른 반으로 이동하세요. 이동 시 '수동 고정' 됩니다.
                                </p>
                            </div>
                            <button onClick={resetManualAssignments} className="btn btn-secondary btn-sm">
                                <RefreshCw style={{ width: 14, height: 14 }} />
                                초기화
                            </button>
                        </div>

                        {/* Color Legend */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            marginBottom: '1rem',
                            padding: '0.75rem',
                            background: 'white',
                            borderRadius: 'var(--radius)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginRight: '0.5rem' }}>원래 반:</span>
                            {Array.from({ length: config.totalCurrentClasses }, (_, i) => {
                                const classNum = i + 1;
                                const color = getClassColor(classNum);
                                return (
                                    <span
                                        key={classNum}
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            padding: '0.25rem 0.5rem',
                                            background: color.bg,
                                            color: color.dark,
                                            borderRadius: 'var(--radius-full)'
                                        }}
                                    >
                                        {classNum}반
                                    </span>
                                );
                            })}
                        </div>

                        {/* Board Columns */}
                        <div className="board-container">
                            {NEW_CLASS_NAMES.slice(0, config.totalNewClasses).map((className) => {
                                const classStats = processedData.stats[className];
                                const studentsInClass = processedData.allAssigned
                                    .filter(s => s.newClass === className)
                                    .sort((a, b) => {
                                        // Sort: gender (M first), then rank
                                        if (a.gender !== b.gender) return a.gender === 'M' ? -1 : 1;
                                        return a.rank - b.rank;
                                    });

                                const isDragOver = dragOverColumn === className;

                                return (
                                    <div
                                        key={className}
                                        className={`board-column ${isDragOver ? 'drag-over' : ''}`}
                                        onDragOver={(e) => handleDragOver(e, className)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, className)}
                                    >
                                        <div className="board-column-header">
                                            <div className="board-column-title">
                                                <h3>{className}반</h3>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '0.25rem 0.625rem',
                                                    background: 'var(--gray-800)',
                                                    color: 'white',
                                                    borderRadius: 'var(--radius-full)'
                                                }}>
                                                    {classStats.total}명
                                                </span>
                                            </div>
                                            <div className="board-column-stats">
                                                <span className="male">남 {classStats.M}</span>
                                                <span className="female">여 {classStats.F}</span>
                                                {classStats.transfer > 0 && (
                                                    <span className="transfer">전출 {classStats.transfer}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="board-column-body">
                                            {studentsInClass.length > 0 ? (
                                                studentsInClass.map((student) => {
                                                    const originColor = getClassColor(student.originalClass);
                                                    return (
                                                        <div
                                                            key={student.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, student.id)}
                                                            onDragEnd={handleDragEnd}
                                                            className={`student-card ${student.isManual ? 'manual' : ''} ${draggedStudentId === student.id ? 'dragging' : ''}`}
                                                        >
                                                            <div
                                                                className={`gender-indicator ${student.gender === 'M' ? 'male' : 'female'}`}
                                                            />

                                                            <div className="student-card-header">
                                                                <div>
                                                                    <div className="student-card-name">
                                                                        {student.name}
                                                                        {student.isManual && (
                                                                            <Lock style={{ width: 12, height: 12, color: 'var(--primary-500)' }} />
                                                                        )}
                                                                    </div>
                                                                    <div className="student-card-meta">
                                                                        {student.gender === 'M' ? '남' : '여'} · 석차 {student.rank || '-'}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span
                                                                        className="origin-badge"
                                                                        style={{
                                                                            background: originColor.bg,
                                                                            color: originColor.dark
                                                                        }}
                                                                    >
                                                                        {student.originalClass}반
                                                                    </span>
                                                                    <GripVertical style={{ width: 14, height: 14, color: 'var(--gray-300)' }} />
                                                                </div>
                                                            </div>

                                                            {(student.note || student.isTransfer) && (
                                                                <div className="student-card-note">
                                                                    {student.isTransfer && <strong style={{ color: '#dc2626' }}>[전출] </strong>}
                                                                    {student.note}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-column">
                                                    학생 없음<br />
                                                    <small>드래그하여 추가</small>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Global Stats */}
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'white',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>전체 학생</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{students.length}명</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>남학생</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--male-color)' }}>
                                    {students.filter(s => s.gender === 'M').length}명
                                    <span style={{ fontSize: '0.875rem', fontWeight: 400, marginLeft: '0.5rem' }}>
                                        ({students.length > 0 ? Math.round(students.filter(s => s.gender === 'M').length / students.length * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>여학생</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--female-color)' }}>
                                    {students.filter(s => s.gender === 'F').length}명
                                    <span style={{ fontSize: '0.875rem', fontWeight: 400, marginLeft: '0.5rem' }}>
                                        ({students.length > 0 ? Math.round(students.filter(s => s.gender === 'F').length / students.length * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>수동 배정</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                                    {students.filter(s => s.manualClass).length}명
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============ Tab: Result / Print ============ */}
                <div style={{ display: activeTab === 'result' ? 'block' : 'none' }}>
                    {/* Form 1: 통계표 */}
                    <div className="result-section">
                        <div className="print-title">&lt;서식 1&gt; 학년별 분반 통계표</div>
                        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem' }}>
                            {config.year}학년도 학년별 분반 통계표 (신 {config.grade + 1}학년)
                        </div>
                        <div style={{ textAlign: 'right', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            {new Date().getFullYear()}. 12. 17. 서울신답초등학교
                        </div>
                        <div style={{ textAlign: 'left', marginBottom: '1rem', fontWeight: 600 }}>
                            {config.grade}학년 (부장, 특수부장) _______________ (인)
                        </div>

                        <table className="result-table">
                            <thead>
                                <tr style={{ background: 'var(--gray-100)' }}>
                                    <th colSpan={2 + config.totalCurrentClasses * 3}>분반 전 재적 ({config.year}. 12. 17. 기준)</th>
                                    <th colSpan={1 + config.totalNewClasses * 3}>분반 후 재적</th>
                                </tr>
                                <tr style={{ background: 'var(--gray-50)' }}>
                                    <th>구분</th>
                                    {Array.from({ length: config.totalCurrentClasses }, (_, i) => (
                                        <React.Fragment key={i}>
                                            <th>{i + 1}반 남</th>
                                            <th>{i + 1}반 여</th>
                                            <th>{i + 1}반 계</th>
                                        </React.Fragment>
                                    ))}
                                    <th>구분</th>
                                    {NEW_CLASS_NAMES.slice(0, config.totalNewClasses).map(name => (
                                        <React.Fragment key={name}>
                                            <th>{name}반 남</th>
                                            <th>{name}반 여</th>
                                            <th>{name}반 계</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{config.grade}학년</td>
                                    {Array.from({ length: config.totalCurrentClasses }, (_, i) => {
                                        const classNum = i + 1;
                                        const classStudents = students.filter(s => s.originalClass === classNum);
                                        const boys = classStudents.filter(s => s.gender === 'M').length;
                                        const girls = classStudents.filter(s => s.gender === 'F').length;
                                        return (
                                            <React.Fragment key={i}>
                                                <td>{boys}</td>
                                                <td>{girls}</td>
                                                <td><strong>{boys + girls}</strong></td>
                                            </React.Fragment>
                                        );
                                    })}
                                    <td>{config.grade}학년</td>
                                    {NEW_CLASS_NAMES.slice(0, config.totalNewClasses).map(name => {
                                        const stats = processedData.stats[name];
                                        return (
                                            <React.Fragment key={name}>
                                                <td>{stats.M}</td>
                                                <td>{stats.F}</td>
                                                <td><strong>{stats.total}</strong></td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                                <tr style={{ fontWeight: 600, background: 'var(--gray-50)' }}>
                                    <td>계</td>
                                    {(() => {
                                        const totalM = students.filter(s => s.gender === 'M').length;
                                        const totalF = students.filter(s => s.gender === 'F').length;
                                        return (
                                            <>
                                                <td colSpan={config.totalCurrentClasses * 3 - 2}></td>
                                                <td>{totalM}</td>
                                                <td>{totalF}</td>
                                                <td><strong>{totalM + totalF}</strong></td>
                                            </>
                                        );
                                    })()}
                                    <td>계</td>
                                    {(() => {
                                        const totalM = Object.values(processedData.stats).reduce((acc, v) => acc + v.M, 0);
                                        const totalF = Object.values(processedData.stats).reduce((acc, v) => acc + v.F, 0);
                                        return (
                                            <>
                                                <td colSpan={config.totalNewClasses * 3 - 2}></td>
                                                <td>{totalM}</td>
                                                <td>{totalF}</td>
                                                <td><strong>{totalM + totalF}</strong></td>
                                            </>
                                        );
                                    })()}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="page-break"></div>

                    {/* Form 2: 분반기초자료 - 반별 */}
                    {Array.from({ length: config.totalCurrentClasses }, (_, i) => i + 1).map(classNum => {
                        const classStudents = students.filter(s => s.originalClass === classNum);
                        const classBoys = processedData.allAssigned
                            .filter(s => s.originalClass === classNum && s.gender === 'M')
                            .sort((a, b) => a.rank - b.rank);
                        const classGirls = processedData.allAssigned
                            .filter(s => s.originalClass === classNum && s.gender === 'F')
                            .sort((a, b) => a.rank - b.rank);

                        return (
                            <React.Fragment key={classNum}>
                                <div className="result-section">
                                    <div className="print-title">&lt;서식 2-{classNum}&gt; {classNum}반 분반기초자료</div>
                                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.125rem', marginBottom: '1rem' }}>
                                        {config.year}학년도 학급별 분반기초자료
                                    </div>

                                    <div style={{ border: '2px solid black', padding: '0.5rem', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', textAlign: 'center', borderBottom: '1px solid black' }}>
                                            <div style={{ width: '25%', padding: '0.5rem', background: 'var(--gray-100)', borderRight: '1px solid black' }}>
                                                {config.year}학년도
                                            </div>
                                            <div style={{ width: '25%', padding: '0.5rem', borderRight: '1px solid black' }}>
                                                제 {config.grade} 학년 {classNum} 반
                                            </div>
                                            <div style={{ width: '15%', padding: '0.5rem', background: 'var(--gray-100)', borderRight: '1px solid black' }}>
                                                재적
                                            </div>
                                            <div style={{ width: '35%', padding: '0.5rem' }}>
                                                남({classStudents.filter(s => s.gender === 'M').length})명,
                                                여({classStudents.filter(s => s.gender === 'F').length})명,
                                                계({classStudents.length})명
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', padding: '0.5rem' }}>
                                            담임 : {config.teacherName} (인)
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {/* Boys */}
                                        <div style={{ flex: 1 }}>
                                            <table className="result-table" style={{ fontSize: '0.8125rem' }}>
                                                <thead>
                                                    <tr><th colSpan="4" style={{ background: 'var(--gray-100)' }}>남 자</th></tr>
                                                    <tr style={{ background: 'var(--gray-50)' }}>
                                                        <th style={{ width: 40 }}>순</th>
                                                        <th>성 명</th>
                                                        <th style={{ width: 50 }}>신반</th>
                                                        <th style={{ width: 100 }}>비고</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {classBoys.map((s, idx) => (
                                                        <tr key={s.id}>
                                                            <td>{idx + 1}</td>
                                                            <td>{s.name}</td>
                                                            <td style={{ fontWeight: 600 }}>
                                                                {s.newClass}{s.isManual && '*'}
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }}>
                                                                {s.isTransfer ? '전출예정' : ''}{s.note && (s.isTransfer ? `, ${s.note}` : s.note)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {classBoys.length === 0 && <tr><td colSpan="4">-</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Girls */}
                                        <div style={{ flex: 1 }}>
                                            <table className="result-table" style={{ fontSize: '0.8125rem' }}>
                                                <thead>
                                                    <tr><th colSpan="4" style={{ background: 'var(--gray-100)' }}>여 자</th></tr>
                                                    <tr style={{ background: 'var(--gray-50)' }}>
                                                        <th style={{ width: 40 }}>순</th>
                                                        <th>성 명</th>
                                                        <th style={{ width: 50 }}>신반</th>
                                                        <th style={{ width: 100 }}>비고</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {classGirls.map((s, idx) => (
                                                        <tr key={s.id}>
                                                            <td>{idx + 1}</td>
                                                            <td>{s.name}</td>
                                                            <td style={{ fontWeight: 600 }}>
                                                                {s.newClass}{s.isManual && '*'}
                                                            </td>
                                                            <td style={{ fontSize: '0.75rem' }}>
                                                                {s.isTransfer ? '전출예정' : ''}{s.note && (s.isTransfer ? `, ${s.note}` : s.note)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {classGirls.length === 0 && <tr><td colSpan="4">-</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', textAlign: 'right', color: 'var(--gray-500)' }}>
                                        * 표시는 수동 배정됨
                                    </div>
                                </div>
                                <div className="page-break"></div>
                            </React.Fragment>
                        );
                    })}

                    {/* Form 3: 가출석부 - Sorted by name (가나다순) */}
                    <div className="result-section">
                        <div className="print-title">&lt;서식 3&gt; {config.year + 1}학년도 가출석부</div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {NEW_CLASS_NAMES.slice(0, config.totalNewClasses).map((newClassName) => {
                                // Sort by name (가나다순), regardless of gender
                                const studentsInNewClass = [...processedData.allAssigned]
                                    .filter(s => s.newClass === newClassName)
                                    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

                                if (studentsInNewClass.length === 0) return null;

                                return (
                                    <div key={newClassName} style={{ breakInside: 'avoid' }}>
                                        <div style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            fontWeight: 700,
                                            background: 'var(--gray-100)',
                                            border: '1px solid black',
                                            borderBottom: 'none'
                                        }}>
                                            신설 {config.grade + 1}학년 "{newClassName}"반 명단 (가나다순)
                                        </div>
                                        <table className="result-table" style={{ fontSize: '0.8125rem' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--gray-50)' }}>
                                                    <th style={{ width: 35 }}>번호</th>
                                                    <th>성명</th>
                                                    <th style={{ width: 35 }}>성별</th>
                                                    <th style={{ width: 50 }}>원반</th>
                                                    <th>비고</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentsInNewClass.map((s, idx) => (
                                                    <tr key={s.id}>
                                                        <td>{idx + 1}</td>
                                                        <td style={{ textAlign: 'left', paddingLeft: '0.5rem' }}>{s.name}</td>
                                                        <td>{s.gender === 'M' ? '남' : '여'}</td>
                                                        <td>{s.originalClass}반</td>
                                                        <td style={{ fontSize: '0.75rem', textAlign: 'left' }}>
                                                            {s.isTransfer ? '전출' : s.note}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            textAlign: 'right',
                                            padding: '0.25rem 0.5rem',
                                            border: '1px solid black',
                                            borderTop: 'none'
                                        }}>
                                            총 {studentsInNewClass.length}명
                                            (남 {studentsInNewClass.filter(s => s.gender === 'M').length},
                                            여 {studentsInNewClass.filter(s => s.gender === 'F').length})
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
