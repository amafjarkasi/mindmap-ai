import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { authService } from './auth';
import type { Template, TemplateCategory, TemplateNode } from '@types/index';

class TemplateService {
  private readonly COLLECTION_NAME = 'templates';
  private builtInTemplates: Template[] = [];

  constructor() {
    this.initializeBuiltInTemplates();
  }

  private initializeBuiltInTemplates(): void {
    this.builtInTemplates = [
      {
        id: 'business-strategy',
        name: 'Business Strategy Analysis',
        description: 'Comprehensive framework for analyzing business strategy and competitive positioning',
        category: 'business',
        structure: [
          { text: 'Business Strategy Analysis', level: 0 },
          { text: 'Market Analysis', level: 1 },
          { text: 'Target Market Segments', level: 2, placeholder: true },
          { text: 'Market Size & Growth', level: 2, placeholder: true },
          { text: 'Customer Needs & Pain Points', level: 2, placeholder: true },
          { text: 'Competitive Landscape', level: 1 },
          { text: 'Direct Competitors', level: 2, placeholder: true },
          { text: 'Indirect Competitors', level: 2, placeholder: true },
          { text: 'Competitive Advantages', level: 2, placeholder: true },
          { text: 'SWOT Analysis', level: 1 },
          { text: 'Strengths', level: 2, placeholder: true },
          { text: 'Weaknesses', level: 2, placeholder: true },
          { text: 'Opportunities', level: 2, placeholder: true },
          { text: 'Threats', level: 2, placeholder: true },
          { text: 'Strategic Objectives', level: 1 },
          { text: 'Short-term Goals', level: 2, placeholder: true },
          { text: 'Long-term Vision', level: 2, placeholder: true },
          { text: 'Key Performance Indicators', level: 2, placeholder: true }
        ],
        isPublic: true,
        author: 'system',
        created: new Date().toISOString()
      },
      {
        id: 'project-planning',
        name: 'Project Planning Framework',
        description: 'Structured approach to project planning and management',
        category: 'project-management',
        structure: [
          { text: 'Project Planning', level: 0 },
          { text: 'Project Scope', level: 1 },
          { text: 'Objectives & Goals', level: 2, placeholder: true },
          { text: 'Deliverables', level: 2, placeholder: true },
          { text: 'Success Criteria', level: 2, placeholder: true },
          { text: 'Stakeholder Analysis', level: 1 },
          { text: 'Primary Stakeholders', level: 2, placeholder: true },
          { text: 'Secondary Stakeholders', level: 2, placeholder: true },
          { text: 'Communication Plan', level: 2, placeholder: true },
          { text: 'Resource Planning', level: 1 },
          { text: 'Team Structure', level: 2, placeholder: true },
          { text: 'Budget Requirements', level: 2, placeholder: true },
          { text: 'Technology & Tools', level: 2, placeholder: true },
          { text: 'Timeline & Milestones', level: 1 },
          { text: 'Project Phases', level: 2, placeholder: true },
          { text: 'Key Milestones', level: 2, placeholder: true },
          { text: 'Dependencies', level: 2, placeholder: true },
          { text: 'Risk Management', level: 1 },
          { text: 'Risk Identification', level: 2, placeholder: true },
          { text: 'Mitigation Strategies', level: 2, placeholder: true }
        ],
        isPublic: true,
        author: 'system',
        created: new Date().toISOString()
      },
      {
        id: 'research-methodology',
        name: 'Research Methodology',
        description: 'Comprehensive framework for academic and professional research',
        category: 'research',
        structure: [
          { text: 'Research Methodology', level: 0 },
          { text: 'Research Question', level: 1 },
          { text: 'Problem Statement', level: 2, placeholder: true },
          { text: 'Research Objectives', level: 2, placeholder: true },
          { text: 'Hypotheses', level: 2, placeholder: true },
          { text: 'Literature Review', level: 1 },
          { text: 'Theoretical Framework', level: 2, placeholder: true },
          { text: 'Previous Studies', level: 2, placeholder: true },
          { text: 'Research Gaps', level: 2, placeholder: true },
          { text: 'Methodology', level: 1 },
          { text: 'Research Design', level: 2, placeholder: true },
          { text: 'Data Collection Methods', level: 2, placeholder: true },
          { text: 'Sampling Strategy', level: 2, placeholder: true },
          { text: 'Data Analysis', level: 1 },
          { text: 'Quantitative Analysis', level: 2, placeholder: true },
          { text: 'Qualitative Analysis', level: 2, placeholder: true },
          { text: 'Statistical Methods', level: 2, placeholder: true },
          { text: 'Validation & Reliability', level: 1 },
          { text: 'Internal Validity', level: 2, placeholder: true },
          { text: 'External Validity', level: 2, placeholder: true }
        ],
        isPublic: true,
        author: 'system',
        created: new Date().toISOString()
      },
      {
        id: 'learning-plan',
        name: 'Learning & Development Plan',
        description: 'Structured approach to personal and professional learning',
        category: 'education',
        structure: [
          { text: 'Learning Plan', level: 0 },
          { text: 'Learning Objectives', level: 1 },
          { text: 'Knowledge Goals', level: 2, placeholder: true },
          { text: 'Skill Development', level: 2, placeholder: true },
          { text: 'Competency Targets', level: 2, placeholder: true },
          { text: 'Current State Assessment', level: 1 },
          { text: 'Existing Knowledge', level: 2, placeholder: true },
          { text: 'Current Skills', level: 2, placeholder: true },
          { text: 'Learning Gaps', level: 2, placeholder: true },
          { text: 'Learning Resources', level: 1 },
          { text: 'Formal Education', level: 2, placeholder: true },
          { text: 'Online Courses', level: 2, placeholder: true },
          { text: 'Books & Publications', level: 2, placeholder: true },
          { text: 'Practical Experience', level: 2, placeholder: true },
          { text: 'Learning Timeline', level: 1 },
          { text: 'Short-term Milestones', level: 2, placeholder: true },
          { text: 'Medium-term Goals', level: 2, placeholder: true },
          { text: 'Long-term Objectives', level: 2, placeholder: true },
          { text: 'Progress Tracking', level: 1 },
          { text: 'Assessment Methods', level: 2, placeholder: true },
          { text: 'Success Metrics', level: 2, placeholder: true }
        ],
        isPublic: true,
        author: 'system',
        created: new Date().toISOString()
      },
      {
        id: 'creative-brainstorm',
        name: 'Creative Brainstorming',
        description: 'Framework for creative ideation and concept development',
        category: 'creative',
        structure: [
          { text: 'Creative Brainstorming', level: 0 },
          { text: 'Problem Definition', level: 1 },
          { text: 'Challenge Statement', level: 2, placeholder: true },
          { text: 'Constraints & Parameters', level: 2, placeholder: true },
          { text: 'Success Criteria', level: 2, placeholder: true },
          { text: 'Ideation Techniques', level: 1 },
          { text: 'Free Association', level: 2, placeholder: true },
          { text: 'Mind Mapping', level: 2, placeholder: true },
          { text: 'SCAMPER Method', level: 2, placeholder: true },
          { text: 'Concept Development', level: 1 },
          { text: 'Initial Ideas', level: 2, placeholder: true },
          { text: 'Concept Refinement', level: 2, placeholder: true },
          { text: 'Feasibility Assessment', level: 2, placeholder: true },
          { text: 'Evaluation & Selection', level: 1 },
          { text: 'Evaluation Criteria', level: 2, placeholder: true },
          { text: 'Concept Ranking', level: 2, placeholder: true },
          { text: 'Final Selection', level: 2, placeholder: true }
        ],
        isPublic: true,
        author: 'system',
        created: new Date().toISOString()
      }
    ];
  }

  async getTemplates(category?: TemplateCategory, includePrivate: boolean = false): Promise<Template[]> {
    try {
      const user = authService.getCurrentUser();
      let templates: Template[] = [...this.builtInTemplates];

      // Get public templates from Firestore
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('isPublic', '==', true),
        orderBy('created', 'desc')
      );

      if (category) {
        q = query(q, where('category', '==', category));
      }

      const publicSnapshot = await getDocs(q);
      const publicTemplates = publicSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Template));

      templates.push(...publicTemplates);

      // Get user's private templates if requested and user is authenticated
      if (includePrivate && user) {
        let privateQuery = query(
          collection(db, this.COLLECTION_NAME),
          where('author', '==', user.uid),
          where('isPublic', '==', false),
          orderBy('created', 'desc')
        );

        if (category) {
          privateQuery = query(privateQuery, where('category', '==', category));
        }

        const privateSnapshot = await getDocs(privateQuery);
        const privateTemplates = privateSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Template));

        templates.push(...privateTemplates);
      }

      // Remove duplicates and sort
      const uniqueTemplates = templates.filter((template, index, self) =>
        index === self.findIndex(t => t.id === template.id)
      );

      return uniqueTemplates.sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    } catch (error) {
      console.error('Error getting templates:', error);
      return this.builtInTemplates;
    }
  }

  async getTemplate(id: string): Promise<Template | null> {
    try {
      // Check built-in templates first
      const builtIn = this.builtInTemplates.find(t => t.id === id);
      if (builtIn) {
        return builtIn;
      }

      // Check Firestore
      const templateRef = doc(db, this.COLLECTION_NAME, id);
      const templateDoc = await getDoc(templateRef);
      
      if (!templateDoc.exists()) {
        return null;
      }

      return { id: templateDoc.id, ...templateDoc.data() } as Template;
    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  async saveTemplate(template: Omit<Template, 'id' | 'created' | 'author'>): Promise<string> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to save templates');
    }

    try {
      const templateData = {
        ...template,
        author: user.uid,
        created: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), templateData);
      return docRef.id;
    } catch (error) {
      console.error('Error saving template:', error);
      throw new Error('Failed to save template. Please try again.');
    }
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to update templates');
    }

    try {
      // Check if it's a built-in template
      if (this.builtInTemplates.some(t => t.id === id)) {
        throw new Error('Cannot modify built-in templates');
      }

      const templateRef = doc(db, this.COLLECTION_NAME, id);
      const templateDoc = await getDoc(templateRef);
      
      if (!templateDoc.exists()) {
        throw new Error('Template not found');
      }

      const templateData = templateDoc.data() as Template;
      
      // Check if user has permission to edit
      if (templateData.author !== user.uid) {
        throw new Error('You do not have permission to edit this template');
      }

      await updateDoc(templateRef, {
        ...updates,
        modified: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template. Please try again.');
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to delete templates');
    }

    try {
      // Check if it's a built-in template
      if (this.builtInTemplates.some(t => t.id === id)) {
        throw new Error('Cannot delete built-in templates');
      }

      const templateRef = doc(db, this.COLLECTION_NAME, id);
      const templateDoc = await getDoc(templateRef);
      
      if (!templateDoc.exists()) {
        throw new Error('Template not found');
      }

      const templateData = templateDoc.data() as Template;
      
      // Only author can delete
      if (templateData.author !== user.uid) {
        throw new Error('You do not have permission to delete this template');
      }

      await deleteDoc(templateRef);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template. Please try again.');
    }
  }

  async getUserTemplates(userId?: string): Promise<Template[]> {
    const user = authService.getCurrentUser();
    const targetUserId = userId || user?.uid;
    
    if (!targetUserId) {
      throw new Error('User ID is required');
    }

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('author', '==', targetUserId),
        orderBy('created', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Template));
    } catch (error) {
      console.error('Error getting user templates:', error);
      throw new Error('Failed to load user templates. Please try again.');
    }
  }

  createTemplateFromMindMap(
    mindMapData: any, 
    templateName: string, 
    description: string, 
    category: TemplateCategory,
    isPublic: boolean = false
  ): Omit<Template, 'id' | 'created' | 'author'> {
    const structure: TemplateNode[] = this.convertNodesToTemplateStructure(mindMapData.nodes);

    return {
      name: templateName,
      description,
      category,
      structure,
      isPublic
    };
  }

  private convertNodesToTemplateStructure(nodes: any[]): TemplateNode[] {
    const nodeMap = new Map(nodes.map(node => [node.key, node]));
    const structure: TemplateNode[] = [];

    // Find root nodes
    const rootNodes = nodes.filter(node => !node.parent);
    
    rootNodes.forEach(rootNode => {
      this.addNodeToStructure(rootNode, nodeMap, structure, 0);
    });

    return structure;
  }

  private addNodeToStructure(
    node: any, 
    nodeMap: Map<string, any>, 
    structure: TemplateNode[], 
    level: number
  ): void {
    structure.push({
      text: node.text,
      level,
      placeholder: false
    });

    // Add children
    const children = Array.from(nodeMap.values()).filter(n => n.parent === node.key);
    children.forEach(child => {
      this.addNodeToStructure(child, nodeMap, structure, level + 1);
    });
  }

  getTemplateCategories(): { value: TemplateCategory; label: string; description: string }[] {
    return [
      {
        value: 'business',
        label: 'Business',
        description: 'Strategic planning, analysis, and business development'
      },
      {
        value: 'education',
        label: 'Education',
        description: 'Learning plans, curriculum design, and educational frameworks'
      },
      {
        value: 'research',
        label: 'Research',
        description: 'Research methodology, analysis, and academic frameworks'
      },
      {
        value: 'personal',
        label: 'Personal',
        description: 'Personal development, goal setting, and life planning'
      },
      {
        value: 'project-management',
        label: 'Project Management',
        description: 'Project planning, execution, and management frameworks'
      },
      {
        value: 'creative',
        label: 'Creative',
        description: 'Brainstorming, ideation, and creative development'
      },
      {
        value: 'analysis',
        label: 'Analysis',
        description: 'Problem analysis, decision making, and evaluation frameworks'
      }
    ];
  }

  validateTemplate(template: Partial<Template>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.description || template.description.trim().length === 0) {
      errors.push('Template description is required');
    }

    if (!template.category) {
      errors.push('Template category is required');
    }

    if (!template.structure || template.structure.length === 0) {
      errors.push('Template structure cannot be empty');
    }

    if (template.structure) {
      const hasRootNode = template.structure.some(node => node.level === 0);
      if (!hasRootNode) {
        errors.push('Template must have at least one root node (level 0)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const templateService = new TemplateService();
export default templateService;
