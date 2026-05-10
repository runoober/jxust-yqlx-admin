# 组织功能 API 文档

本文档用于前端接入组织功能，接口均基于当前后端实现整理。

## 基础说明

- 基础前缀：`/api/v0`
- 鉴权方式：`Authorization: Bearer <access_token>`
- 返回结构：统一使用 `StatusCode`、`StatusMessage`、`RequestId`、`Result`
- 组织字段说明：
  - `name`: 组织名称
  - `organization_type`: 组织类型
  - `affiliation`: 组织所属
  - `campus`: 组织校区
  - `introduction`: 组织介绍
  - `contact`: 联系方式

## 数据结构

组织对象示例：

```json
{
  "id": 1,
  "name": "青年志愿者协会",
  "organization_type": "学生组织",
  "affiliation": "校团委",
  "campus": "红旗校区",
  "introduction": "负责校内外志愿服务活动组织与执行。",
  "contact": "0797-1234567",
  "created_at": "2026-03-19T10:00:00+08:00",
  "updated_at": "2026-03-19T10:00:00+08:00"
}
```

## 用户侧接口

### 1. 获取组织列表

- 方法：`GET`
- 路径：`/api/v0/organizations/`
- 权限：`organization.get`

查询参数：

- `query`: 关键字搜索，可匹配名称、类型、所属、校区、介绍、联系方式
- `organization_type`: 组织类型，精确筛选
- `affiliation`: 组织所属，精确筛选
- `campus`: 校区，精确筛选
- `page`: 页码，默认 `1`
- `page_size`: 每页数量，默认 `10`，最大 `100`

请求示例：

```http
GET /api/v0/organizations/?query=志愿&page=1&page_size=10
Authorization: Bearer <token>
```

成功响应示例：

```json
{
  "StatusCode": 0,
  "StatusMessage": "Success",
  "RequestId": "req_xxx",
  "Result": {
    "data": [
      {
        "id": 1,
        "name": "青年志愿者协会",
        "organization_type": "学生组织",
        "affiliation": "校团委",
        "campus": "红旗校区",
        "introduction": "负责校内外志愿服务活动组织与执行。",
        "contact": "0797-1234567",
        "created_at": "2026-03-19T10:00:00+08:00",
        "updated_at": "2026-03-19T10:00:00+08:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 10
  }
}
```

### 2. 获取组织详情

- 方法：`GET`
- 路径：`/api/v0/organizations/:id`
- 权限：`organization.get`

请求示例：

```http
GET /api/v0/organizations/1
Authorization: Bearer <token>
```

成功响应示例：

```json
{
  "StatusCode": 0,
  "StatusMessage": "Success",
  "RequestId": "req_xxx",
  "Result": {
    "id": 1,
    "name": "青年志愿者协会",
    "organization_type": "学生组织",
    "affiliation": "校团委",
    "campus": "红旗校区",
    "introduction": "负责校内外志愿服务活动组织与执行。",
    "contact": "0797-1234567",
    "created_at": "2026-03-19T10:00:00+08:00",
    "updated_at": "2026-03-19T10:00:00+08:00"
  }
}
```

## 管理侧接口

管理端权限统一为 `organization.manage`。

### 1. 获取组织列表

- 方法：`GET`
- 路径：`/api/v0/admin/organizations`

查询参数与用户侧列表接口一致。

### 2. 获取组织详情

- 方法：`GET`
- 路径：`/api/v0/admin/organizations/:id`

### 3. 创建组织

- 方法：`POST`
- 路径：`/api/v0/admin/organizations`
- 请求头：建议携带 `X-Idempotency-Key`

请求体：

```json
{
  "name": "青年志愿者协会",
  "organization_type": "学生组织",
  "affiliation": "校团委",
  "campus": "红旗校区",
  "introduction": "负责校内外志愿服务活动组织与执行。",
  "contact": "0797-1234567"
}
```

成功响应：`Result` 为创建后的完整组织对象。

### 4. 更新组织

- 方法：`PUT`
- 路径：`/api/v0/admin/organizations/:id`

请求体支持部分更新，至少传一个字段：

```json
{
  "campus": "三江校区",
  "contact": "updated@example.com",
  "introduction": "更新后的组织介绍"
}
```

成功响应：`Result` 为更新后的完整组织对象。

### 5. 删除组织

- 方法：`DELETE`
- 路径：`/api/v0/admin/organizations/:id`

成功响应示例：

```json
{
  "StatusCode": 0,
  "StatusMessage": "Success",
  "RequestId": "req_xxx",
  "Result": {
    "message": "删除成功"
  }
}
```

## 前端实现建议

- 用户端页面建议至少支持：关键字搜索、类型筛选、所属筛选、校区筛选、分页。
- 列表页建议直接展示：名称、类型、所属、校区。
- 详情页建议完整展示介绍和联系方式。
- 管理端编辑表单可全部使用单行输入框，介绍如果篇幅较长建议前端用多行输入组件。
- 更新接口是部分更新，前端提交时可以只传变更字段。

## 错误处理

常见错误：

- `400`: 参数错误或空字符串更新
- `401`: 未登录
- `403`: 无权限
- `404`: 组织不存在
- `500`: 服务器内部错误