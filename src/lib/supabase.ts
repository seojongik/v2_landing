import { createClient } from '@supabase/supabase-js';

// Supabase 설정 (CRM, myxplanner와 동일한 프로젝트)
const SUPABASE_URL = 'https://yejialakeivdhwntmagf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllamlhbGFrZWl2ZGh3bnRtYWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTE0MjcsImV4cCI6MjA3OTQ4NzQyN30.a1WA6V7pD2tss1pkh1OSJcuknt6FTyeabvm9UzNjcfs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 테이블명 매핑 (legacy → v2)
const mapTableName = (table: string): string => {
  const tableMapping: Record<string, string> = {
    'board': 'v2_board',
    'Board': 'v2_board',
    'staff': 'v2_staff_pro',
    'Staff': 'v2_staff_pro',
  };
  return tableMapping[table] ?? table;
};

// WHERE 조건 타입
interface WhereCondition {
  field: string;
  operator: string;
  value: any;
}

// ORDER BY 타입
interface OrderBy {
  field: string;
  direction?: 'ASC' | 'DESC';
}

// 데이터 조회
export async function getData(params: {
  table: string;
  fields?: string[];
  where?: WhereCondition[];
  orderBy?: OrderBy[];
  order?: OrderBy;
  limit?: number;
}): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const tableName = mapTableName(params.table).toLowerCase();

    // SELECT 필드 설정
    const selectFields = (!params.fields || params.fields.length === 0 || params.fields.includes('*'))
      ? '*'
      : params.fields.map(f => f.toLowerCase()).join(', ');

    let query = supabase.from(tableName).select(selectFields);

    // WHERE 조건 적용
    if (params.where && params.where.length > 0) {
      for (const condition of params.where) {
        const field = condition.field.toLowerCase();
        const operator = condition.operator.toUpperCase();
        const value = condition.value;

        switch (operator) {
          case '=':
            query = query.eq(field, value);
            break;
          case '>':
            query = query.gt(field, value);
            break;
          case '<':
            query = query.lt(field, value);
            break;
          case '>=':
            query = query.gte(field, value);
            break;
          case '<=':
            query = query.lte(field, value);
            break;
          case '<>':
          case '!=':
            query = query.neq(field, value);
            break;
          case 'LIKE':
            query = query.ilike(field, value);
            break;
          case 'IN':
            if (Array.isArray(value)) {
              query = query.in(field, value);
            }
            break;
        }
      }
    }

    // ORDER BY 적용
    const orderList = params.orderBy || (params.order ? [params.order] : []);
    for (const order of orderList) {
      const field = order.field.toLowerCase();
      const ascending = (order.direction?.toUpperCase() ?? 'ASC') === 'ASC';
      query = query.order(field, { ascending });
    }

    // LIMIT 적용
    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase getData error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (e) {
    console.error('getData exception:', e);
    return { success: false, error: String(e) };
  }
}

// 데이터 추가
export async function addData(params: {
  table: string;
  data: Record<string, any>;
}): Promise<{ success: boolean; insertId?: any; data?: any; error?: string }> {
  try {
    const tableName = mapTableName(params.table).toLowerCase();

    // 컬럼명 소문자 변환
    const cleanedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(params.data)) {
      cleanedData[key.toLowerCase()] = value;
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(cleanedData)
      .select()
      .single();

    if (error) {
      console.error('Supabase addData error:', error);
      return { success: false, error: error.message };
    }

    // insertId 추출
    const insertId = data?.branch_id ||
                     data?.manager_contract_id ||
                     data?.pro_contract_id ||
                     data?.member_id ||
                     data?.id ||
                     'unknown';

    return { success: true, insertId, data };
  } catch (e) {
    console.error('addData exception:', e);
    return { success: false, error: String(e) };
  }
}

// 데이터 업데이트
export async function updateData(params: {
  table: string;
  data: Record<string, any>;
  where: WhereCondition[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const tableName = mapTableName(params.table).toLowerCase();

    // 컬럼명 소문자 변환
    const cleanedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(params.data)) {
      cleanedData[key.toLowerCase()] = value;
    }

    let query = supabase.from(tableName).update(cleanedData);

    // WHERE 조건 적용
    for (const condition of params.where) {
      const field = condition.field.toLowerCase();
      query = query.eq(field, condition.value);
    }

    const { error } = await query;

    if (error) {
      console.error('Supabase updateData error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error('updateData exception:', e);
    return { success: false, error: String(e) };
  }
}
