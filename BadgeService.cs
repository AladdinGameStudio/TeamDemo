using System;
using System.Collections.Generic;
using DMedia.Achievements.Business.Contract;
using DMedia.Achievements.Business.Gateway;
using DMedia.Achievements.Business.Model;
using DMedia.Achievements.Business.Repository;
using System.Threading;
using DMedia.Achievements.NotificationDispatcher;

namespace DMedia.Achievements.Business.Service
{
	public class BadgeService : IBadgeService
	{
		private static IAchievementRepository aRepo = new AchievementRepository();
		private static IBadgeCounterRepository bcp = new BadgeCounterRepository();
		private static IBadgeRepository br = new BadgeRepository();
		private static IAchievementService aSrv = new AchievementService();

		public BadgeModel GetBadgeModel(int badgeId)
		{
			return br.GetAll()[badgeId];
		}

		#region IBadgeService Members

		public void UpdateCounts(int internalId, int badgeId, short counts)
		{
			if (internalId < 1 || badgeId < 1 || counts < 0)
				return;

			// TODO:根据badgeId选择累加方式
			var badgeModel = GetBadgeModel(badgeId);
			if (badgeModel == null) return;
			
			//在一期工程中badgeId==achievementId
			var targetValue = aRepo.GetAll()[badgeId].TargetValue;
			var finalValue = -1;

			if (badgeModel.BadgeCounterType == BadgeCounterType.NonTimeConstraint)
			{
				//直接累加方式的处理：累加后返回其结果
				finalValue = bcp.UpdateCountsOfNonTime(internalId, badgeId, counts);
				//在一期工程中badgeId==achievementId
				if (finalValue >= targetValue)
				{
					//成就达成
					ProcessAchievementComplete(badgeId, internalId, DeleteCountsNonTimeRecord);
				}
			}
			else if (badgeModel.BadgeCounterType == BadgeCounterType.WithContinuousTimeConstraint)
			{
				finalValue = bcp.UpdateCountsOfContinuousTimeConstraint(internalId, badgeId, counts, badgeModel.ConstraintOfCountinuousTime);
				//在一期工程中badgeId==achievementId
				if (finalValue >= targetValue)
				{
					//成就达成
					ProcessAchievementComplete(badgeId, internalId, DeleteCountsOfContinuousTimeRecord);
				}
			}
			else if (badgeModel.BadgeCounterType == BadgeCounterType.WithTimeRangeConstraint)
			{
				if (badgeModel.ConstraintOfTimeRangeStart >= DateTime.Now && DateTime.Now <= badgeModel.ConstraintOfTimeRangeEnd)
				{
					//在时间范围的约束内完成一次,即认为任务完成
					ProcessAchievementComplete(badgeId, internalId, null);
				}
			}
		}

		public BadgeCounterType GetBadgeCounterType(int badgeId)
		{
			return BadgeCounterTypeSelector.GetCounterType(badgeId);
		}

		public void ResetContinuousTimeCounter(int internalId, int badgeId)
		{
			var badgeModel = GetBadgeModel(badgeId);  
			if (badgeModel == null) return;

			bcp.ResetCountsOfContinuousTimeRecord(internalId, badgeId, badgeModel.ConstraintOfCountinuousTime);
		}

		#endregion

		/// <summary>
		/// 成就达成后的处理工作
		/// </summary>
		/// <param name="badgeId"></param>
		/// <param name="internalId"></param>
		private void ProcessAchievementComplete(int badgeId, int internalId, Action<int,int,int> deleteMiddleValue)
		{
			//插入到已完成表中
			//在一期工程中badgeId==achivementId
			var result = aRepo.SetAchievementComplete(internalId, badgeId);
			if (result == 200)
			{
				ThreadPool.QueueUserWorkItem(p =>
				{
					var am = p as AchievementNotificationModel;
					if (am == null) return;

					NotifyDispatcher.Notify(am.InternalId, am.AchievementId);
				},
					new AchievementNotificationModel() { InternalId = internalId, AchievementId = badgeId }
				);
			}
			//插入成功,删除掉计算模型中的中间结果
			//扩展为多任务时这里需要根据achievementId查找到对应的badgeId
			if (deleteMiddleValue != null)
			{
				deleteMiddleValue(internalId, badgeId, result);
			}
		}

		/// <summary>
		/// 非时间限制任务下,插入成功后,删除掉计算模型中的中间结果
		/// </summary>
		/// <param name="internalId">Internla id</param>
		/// <param name="badgeId">Badge id</param>
		/// <param name="completeState">Complete State</param>
		private void DeleteCountsNonTimeRecord(int internalId, int badgeId, int completeState)
		{
			bcp.DeleteCountsNonTimeRecord(internalId, badgeId);
			//result==1说明该成就已经达成过
			if (completeState == 1)
			{
				bcp.InsertBadgeOpErrorLog(internalId, badgeId);
			}
		}

		/// <summary>
		/// 持续时间限制任务下,插入成功后,删除掉计算模型中的中间结果
		/// </summary>
		/// <param name="internalId">Internla id</param>
		/// <param name="badgeId">Badge id</param>
		/// <param name="completeState">Complete State</param>
		private void DeleteCountsOfContinuousTimeRecord(int internalId, int badgeId, int completeState)
		{
			bcp.DeleteCountsOfContinuousTimeConstraintRecord(internalId, badgeId);
			if (completeState == 1)
			{
				bcp.InsertBadgeOpErrorLog(internalId, badgeId);
			}
		}

		private class AchievementNotificationModel {
			public int InternalId { get; set; }
			public int AchievementId { get; set; }
		}
	}

	public enum BadgeServiceResult
	{
		OK = 0,
		// for UpdateCounts method
		InvalidUserId = 10,
		InvalidBadgeId = 11,
		InvalidCounts = 12,
		// general error
		UnhandledException = 500
	}
}
