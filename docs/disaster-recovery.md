# Disaster Recovery Plan

## Backup Strategy

### Supabase Database Backups

- **Automatic daily backups**: Enabled via Supabase Pro plan
- **Point-in-Time Recovery (PITR)**: Enable in Supabase Dashboard > Database > Backups
  - Allows recovery to any point within the retention window
  - Retention: 7 days (Pro plan)

### Manual Backup Procedure

For additional safety, run periodic `pg_dump` backups:

```bash
# Set connection string from Supabase Dashboard > Settings > Database
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Full backup
pg_dump $DATABASE_URL --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Restore from backup
pg_restore --dbname=$DATABASE_URL backup_YYYYMMDD_HHMMSS.dump
```

## Recovery Procedures

### Database Recovery (Supabase)

1. Go to Supabase Dashboard > Database > Backups
2. Select the backup point to restore to
3. Click "Restore" and confirm
4. Wait for restoration to complete (may take several minutes)

### Application Recovery (Vercel)

1. Vercel maintains all deployment history
2. To rollback: Vercel Dashboard > Deployments > find previous working deployment > "..." > Promote to Production
3. Or via CLI: `vercel rollback [deployment-url]`

### Environment Variables Recovery

- All env vars are stored in Vercel project settings
- Backup env vars periodically: `vercel env ls` and document securely

## Failover

### Database Failover

- Supabase handles database failover automatically on Pro plan
- Read replicas can be added for high availability

### Application Failover

- Vercel deploys to edge network globally with automatic failover
- No manual intervention required for CDN/edge failures

## Monitoring

### Health Check

- Endpoint: `GET /api/health`
- Returns database connectivity and latency status
- Configure uptime monitoring (e.g., Vercel Cron, UptimeRobot) to poll this endpoint

### Alerts

- Set up Vercel deployment notifications in project settings
- Configure Supabase alerts for database issues in Dashboard > Settings > Alerts

## Contact

In case of emergency:

1. Check Supabase status: https://status.supabase.com
2. Check Vercel status: https://www.vercel-status.com
3. Contact the development team
